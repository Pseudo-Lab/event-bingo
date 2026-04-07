from fastapi import APIRouter, Depends, Query
from core.db import AsyncSessionDepends
from models.bingo import BingoBoards
from models.event import Event
from api.auth.schema import (
    LoginToken,
    LoginResponse,
    BingoUser,
    BingoParticipantSearchResult,
    BingoParticipantItem,
    BingoUpdateDisplayNameRequest,
    LoginType,
    LoginUrl,
    BingoRegisterRequest,
    BingoLoginRequest,
)
from api.auth.services.bingo_login import (
    LoginBingoUser,
    RegisterBingoUser,
)

auth_router = APIRouter(prefix="/auth")


@auth_router.post("/bingo/register", response_model=BingoUser, description="빙고 회원가입 API")
async def bingo_register(
    data: BingoRegisterRequest,
    register_bingo_user: RegisterBingoUser = Depends(RegisterBingoUser),
):
    res = await register_bingo_user.execute(data.username, data.password, data.event_slug)
    return res


@auth_router.post("/bingo/login", response_model=BingoUser, description="빙고 로그인 API")
async def bingo_login(
    data: BingoLoginRequest,
    login_bingo_user: LoginBingoUser = Depends(LoginBingoUser),
):
    res = await login_bingo_user.execute(data.login_id, data.password, data.event_slug)
    return res


@auth_router.get("/bingo/search", response_model=BingoParticipantSearchResult, description="빙고 참가자 이름 검색 API")
async def bingo_search_participants(
    q: str = Query(..., min_length=1, max_length=100, description="검색할 이름"),
    event_slug: str = Query(..., min_length=1, max_length=100, description="이벤트 slug"),
    session: AsyncSessionDepends = None,
):
    event = await Event.get_by_slug(session, event_slug)
    if not event:
        return BingoParticipantSearchResult(ok=False, message="이벤트를 찾을 수 없습니다.", participants=[])

    boards = await BingoBoards.search_by_display_name(session, event.id, q)
    return BingoParticipantSearchResult(
        ok=True,
        message=f"{len(boards)}명의 참가자를 찾았습니다.",
        participants=[
            BingoParticipantItem(
                user_id=b.user_id,
                display_name=b.display_name or "",
            )
            for b in boards
        ],
    )


@auth_router.put("/bingo/display-name", response_model=BingoParticipantItem, description="빙고 표시 이름 변경 API")
async def bingo_update_display_name(
    data: BingoUpdateDisplayNameRequest,
    session: AsyncSessionDepends = None,
):
    event = await Event.get_by_slug(session, data.event_slug)
    if not event:
        return BingoParticipantItem(ok=False, message="이벤트를 찾을 수 없습니다.")

    try:
        board = await BingoBoards.update_display_name(session, data.user_id, event.id, data.display_name.strip())
        return BingoParticipantItem(
            user_id=board.user_id,
            display_name=board.display_name or "",
            ok=True,
            message="이름이 변경되었습니다.",
        )
    except ValueError as e:
        return BingoParticipantItem(ok=False, message=str(e))

import random
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from core.db import AsyncSessionDepends
from core.dependencies import get_current_user
from models.user import BingoUser
from models.event import Event, EventPublishState, GameMode
from models.event_attendee import EventAttendee
from models.bingo.bingo_boards import BingoBoards
from models.team import Team, TeamColor
from models.room import Room

from .schema import JoinEventResponse, RoomStatusResponse, TeamStatusItem, MyEventsResponse, MyEventItem

play_router = APIRouter(prefix="/play", tags=["play"])

CurrentUser = Annotated[BingoUser, Depends(get_current_user)]


def _build_board(keywords: list, board_size: int) -> dict:
    """키워드를 랜덤 셔플하여 빙고판 데이터 생성"""
    cell_count = board_size * board_size
    shuffled = random.sample(keywords, min(len(keywords), cell_count))
    # 키워드가 부족하면 빈칸으로 채움
    while len(shuffled) < cell_count:
        shuffled.append("")
    return {
        str(i): {"value": shuffled[i], "status": 0, "selected": 0}
        for i in range(cell_count)
    }


async def _assign_room_and_team(session, event: Event) -> tuple[int, int]:
    """
    팀전 모드에서 방과 팀을 배정하고 (room_id, team_id) 반환.
    방 정원 = team_size * 2, 정원 초과 시 방 닫고 새 방 생성.
    방 내에서 인원 적은 팀에 배정.
    """
    from sqlalchemy import select

    max_per_room = event.team_size * 2

    room = await Room.get_or_create_open_room(session, event.id, max_per_room)

    # 방 내 팀 현황 파악 (BLUE/RED 인원 카운트)
    blue_result = await session.execute(
        select(EventAttendee).where(
            EventAttendee.room_id == room.id,
            EventAttendee.team_id.isnot(None),
        )
    )
    attendees_in_room = blue_result.scalars().all()

    # 이 방의 팀 가져오기 (없으면 생성)
    teams = await Team.get_by_room(session, room.id)
    team_dict = {t.color: t for t in teams}

    if TeamColor.BLUE not in team_dict:
        blue = Team(name="파랑 팀", event_id=event.id, room_id=room.id, color=TeamColor.BLUE)
        session.add(blue)
        await session.flush()
        team_dict[TeamColor.BLUE] = blue

    if TeamColor.RED not in team_dict:
        red = Team(name="빨강 팀", event_id=event.id, room_id=room.id, color=TeamColor.RED)
        session.add(red)
        await session.flush()
        team_dict[TeamColor.RED] = red

    # 방 내 각 팀 인원 집계
    blue_id = team_dict[TeamColor.BLUE].id
    red_id = team_dict[TeamColor.RED].id

    blue_count = sum(1 for a in attendees_in_room if a.team_id == blue_id)
    red_count = sum(1 for a in attendees_in_room if a.team_id == red_id)

    team_id = blue_id if blue_count <= red_count else red_id

    # 방 정원 초과 여부 체크 (이 참가자 포함 후)
    if len(attendees_in_room) + 1 >= max_per_room:
        await Room.mark_full(session, room.id)

    return room.id, team_id


@play_router.post(
    "/events/{event_slug}/join",
    response_model=JoinEventResponse,
    summary="이벤트 입장 (빙고판 생성)",
)
async def join_event(
    event_slug: str,
    current_user: CurrentUser,
    db: AsyncSessionDepends,
):
    event = await Event.get_by_slug(db, event_slug.strip().lower())
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="이벤트를 찾을 수 없습니다.")

    if event.publish_state != EventPublishState.PUBLISHED:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="공개되지 않은 이벤트입니다.")

    # 중복 참가 체크
    from sqlalchemy import select as sa_select
    existing = await db.execute(
        sa_select(EventAttendee).where(
            EventAttendee.event_id == event.id,
            EventAttendee.user_id == current_user.user_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 참가한 이벤트입니다.")

    # 방/팀 배정 (팀전)
    room_id = None
    team_id = None
    if event.game_mode == GameMode.TEAM:
        room_id, team_id = await _assign_room_and_team(db, event)

    # EventAttendee 생성
    attendee = EventAttendee(
        event_id=event.id,
        user_id=current_user.user_id,
        room_id=room_id,
        team_id=team_id,
    )
    db.add(attendee)
    await db.flush()

    # 빙고판 생성
    board_data = _build_board(event.keywords or [], event.bingo_size)
    board = BingoBoards(
        user_id=current_user.user_id,
        event_id=event.id,
        board_data=board_data,
    )
    db.add(board)
    await db.commit()
    await db.refresh(attendee)

    return JoinEventResponse(
        ok=True,
        message="이벤트에 입장했습니다.",
        attendee_id=attendee.id,
        event_id=event.id,
        user_id=current_user.user_id,
        room_id=room_id,
        team_id=team_id,
        board=board_data,
    )


@play_router.get(
    "/rooms/{room_id}",
    response_model=RoomStatusResponse,
    summary="방 상태 조회 (팀전)",
)
async def get_room_status(
    room_id: int,
    current_user: CurrentUser,
    db: AsyncSessionDepends,
):
    from sqlalchemy import select as sa_select, func

    room = await Room.get_by_id(db, room_id)
    event = await Event.get_by_id(db, room.event_id)

    if event.game_mode != GameMode.TEAM:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="팀전 이벤트가 아닙니다.")

    participant_count = await Room.get_participant_count(db, room_id)

    # 팀 목록 + 팀별 인원수를 단일 쿼리로 조회 (N+1 제거)
    team_count_rows = await db.execute(
        sa_select(Team, func.count(EventAttendee.id).label("member_count"))
        .outerjoin(EventAttendee, (EventAttendee.team_id == Team.id) & (EventAttendee.room_id == room_id))
        .where(Team.room_id == room_id)
        .group_by(Team.id)
    )
    team_items = [
        TeamStatusItem(
            team_id=team.id,
            color=team.color.value,
            name=team.name,
            member_count=count,
        )
        for team, count in team_count_rows.all()
    ]

    return RoomStatusResponse(
        ok=True,
        message="방 상태를 조회했습니다.",
        room_id=room.id,
        room_number=room.room_number,
        event_id=room.event_id,
        is_open=room.is_open,
        participant_count=participant_count,
        max_capacity=event.team_size * 2,
        teams=team_items,
    )


@play_router.get(
    "/me",
    response_model=MyEventsResponse,
    summary="내가 참여 중인 이벤트 목록",
)
async def get_my_events(
    current_user: CurrentUser,
    db: AsyncSessionDepends,
):
    from sqlalchemy import select as sa_select

    # 단일 JOIN 쿼리로 attendee + event + board + team을 한 번에 조회 (N+1 제거)
    rows = await db.execute(
        sa_select(EventAttendee, Event, BingoBoards, Team)
        .join(Event, Event.id == EventAttendee.event_id)
        .outerjoin(
            BingoBoards,
            (BingoBoards.user_id == EventAttendee.user_id)
            & (BingoBoards.event_id == EventAttendee.event_id),
        )
        .outerjoin(Team, Team.id == EventAttendee.team_id)
        .where(EventAttendee.user_id == current_user.user_id)
        .order_by(EventAttendee.created_at.desc())
    )

    items = [
        MyEventItem(
            event_id=event.id,
            event_slug=event.slug,
            event_name=event.name,
            game_mode=event.game_mode.value,
            room_id=att.room_id,
            team_id=att.team_id,
            team_color=team.color.value if team else None,
            bingo_count=board.bingo_count if board else 0,
            joined_at=att.created_at,
        )
        for att, event, board, team in rows.all()
    ]

    return MyEventsResponse(
        ok=True,
        message="참여 중인 이벤트 목록을 조회했습니다.",
        events=items,
    )

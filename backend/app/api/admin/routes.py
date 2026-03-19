from datetime import timedelta
import io

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from starlette.responses import StreamingResponse

from core.db import AsyncSessionDepends
from core.dependencies import authenticate_user
from models.admin import Admin, AdminRole
from models.event import Event, EventPublishState
from models.event_manager_request import EventManagerRequest, EventManagerRequestStatus

from .auth import (
    authenticate_admin_session,
    create_admin_access_token,
    require_admin_role,
)
from .console_services import (
    build_event_detail,
    build_event_summary,
    can_edit_event,
    ensure_admin_console_seed_data,
    ensure_unique_event_slug,
    reset_event_runtime_data,
    serialize_event_manager_request,
    resolve_first_published_at,
    serialize_admin_member,
    serialize_admin_session,
    validate_admin_member_deletion,
    validate_event_schedule,
    validate_publish_transition,
)
from .schema import (
    AdminEventDetailResponse,
    AdminEventListResponse,
    AdminEventManagerRequestListResponse,
    AdminEventManagerRequestResponse,
    AdminEventManagerRequestUpdateRequest,
    AdminEventResetResponse,
    AdminEventResponse,
    AdminEventUpsertRequest,
    AdminLoginRequest,
    AdminLoginResponse,
    AdminMemberCreateRequest,
    AdminMemberDeleteResponse,
    AdminMemberListResponse,
    AdminMemberResponse,
)
from .services import get_all_bingo_boards, get_all_users, set_test_bingo_board

admin_router = APIRouter(prefix="/admin", tags=["admin"])


def to_publish_state(value: str) -> EventPublishState:
    try:
        return EventPublishState(value)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="지원하지 않는 공개 상태입니다.",
        ) from error


def to_event_manager_request_status(value: str) -> EventManagerRequestStatus:
    try:
        return EventManagerRequestStatus(value)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="지원하지 않는 신청 상태입니다.",
        ) from error


@admin_router.post("/auth/login", response_model=AdminLoginResponse, summary="관리자 로그인")
async def admin_login(
    payload: AdminLoginRequest,
    db: AsyncSessionDepends,
):
    await ensure_admin_console_seed_data(db)

    admin = await Admin.get_by_email(db, payload.email.strip().lower())
    if not admin or not admin.verify_password(payload.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호를 확인해 주세요.",
        )

    return AdminLoginResponse(
        ok=True,
        message="관리자 로그인에 성공했습니다.",
        access_token=create_admin_access_token(admin),
        admin=serialize_admin_session(admin),
    )


@admin_router.get("/auth/me", response_model=AdminLoginResponse, summary="현재 관리자 세션 조회")
async def admin_me(
    db: AsyncSessionDepends,
    actor: Admin = Depends(authenticate_admin_session),
):
    await ensure_admin_console_seed_data(db)
    return AdminLoginResponse(
        ok=True,
        message="현재 관리자 정보를 불러왔습니다.",
        admin=serialize_admin_session(actor),
    )


@admin_router.get("/members", response_model=AdminMemberListResponse, summary="관리자 목록 조회")
async def list_admin_members(
    db: AsyncSessionDepends,
    actor: Admin = Depends(authenticate_admin_session),
):
    await ensure_admin_console_seed_data(db)
    require_admin_role(actor)
    members = await Admin.get_all(db)
    return AdminMemberListResponse(
        ok=True,
        message="관리자 목록을 불러왔습니다.",
        members=[serialize_admin_member(member) for member in members],
    )


@admin_router.post("/members", response_model=AdminMemberResponse, summary="관리자 생성")
async def create_admin_member(
    payload: AdminMemberCreateRequest,
    db: AsyncSessionDepends,
    actor: Admin = Depends(authenticate_admin_session),
):
    require_admin_role(actor)

    if len(payload.password) < 8 or not any(character.isupper() for character in payload.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="비밀번호는 영어 대문자를 포함해 8자 이상이어야 합니다.",
        )

    role = AdminRole.ADMIN if payload.role == "admin" else AdminRole.EVENT_MANAGER

    try:
        member = await Admin.create(
            db,
            email=payload.email.strip().lower(),
            password=payload.password,
            name=payload.name.strip(),
            role=role,
        )
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error

    return AdminMemberResponse(
        ok=True,
        message="관리자 계정을 생성했습니다.",
        member=serialize_admin_member(member),
    )


@admin_router.delete(
    "/members/{member_id}",
    response_model=AdminMemberDeleteResponse,
    summary="관리자 삭제",
)
async def delete_admin_member(
    member_id: int,
    db: AsyncSessionDepends,
    actor: Admin = Depends(authenticate_admin_session),
):
    await ensure_admin_console_seed_data(db)
    require_admin_role(actor)

    try:
        member = await Admin.get_by_id(db, member_id)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error

    total_admin_count = (
        await db.execute(select(func.count(Admin.id)).where(Admin.role == AdminRole.ADMIN))
    ).scalar() or 0
    owned_event_count = (
        await db.execute(select(func.count(Event.id)).where(Event.admin_id == member.id))
    ).scalar() or 0

    try:
        validate_admin_member_deletion(
            actor,
            member,
            total_admin_count=total_admin_count,
            owned_event_count=owned_event_count,
        )
        await Admin.delete(db, member.id)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error

    return AdminMemberDeleteResponse(
        ok=True,
        message="관리자 계정을 삭제했습니다.",
        deleted_member_id=member.id,
    )


@admin_router.get(
    "/event-manager-requests",
    response_model=AdminEventManagerRequestListResponse,
    summary="이벤트 관리자 신청 목록 조회",
)
async def list_event_manager_requests(
    db: AsyncSessionDepends,
    actor: Admin = Depends(authenticate_admin_session),
):
    await ensure_admin_console_seed_data(db)
    require_admin_role(actor)

    requests = await EventManagerRequest.get_all(db)
    serialized_requests = [
        await serialize_event_manager_request(db, request_item)
        for request_item in requests
    ]

    return AdminEventManagerRequestListResponse(
        ok=True,
        message="이벤트 관리자 신청 목록을 불러왔습니다.",
        requests=serialized_requests,
        pending_count=sum(1 for request_item in requests if request_item.status == EventManagerRequestStatus.PENDING),
    )


@admin_router.patch(
    "/event-manager-requests/{request_id}",
    response_model=AdminEventManagerRequestResponse,
    summary="이벤트 관리자 신청 상태 변경",
)
async def update_event_manager_request(
    request_id: int,
    payload: AdminEventManagerRequestUpdateRequest,
    db: AsyncSessionDepends,
    actor: Admin = Depends(authenticate_admin_session),
):
    await ensure_admin_console_seed_data(db)
    require_admin_role(actor)

    try:
        updated_request = await EventManagerRequest.update_review(
            db,
            request_id,
            status=to_event_manager_request_status(payload.status),
            review_note=payload.review_note.strip() if payload.review_note else None,
            reviewed_by_admin_id=actor.id,
        )
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error

    return AdminEventManagerRequestResponse(
        ok=True,
        message="신청 상태를 업데이트했습니다.",
        request=await serialize_event_manager_request(db, updated_request),
    )


@admin_router.get("/events", response_model=AdminEventListResponse, summary="이벤트 목록 조회")
async def list_admin_events(
    db: AsyncSessionDepends,
    actor: Admin = Depends(authenticate_admin_session),
):
    await ensure_admin_console_seed_data(db)
    events = await Event.get_all(db)
    event_items = [await build_event_summary(db, event, actor) for event in events]

    return AdminEventListResponse(
        ok=True,
        message="이벤트 목록을 불러왔습니다.",
        events=event_items,
    )


@admin_router.get("/events/{event_id}", response_model=AdminEventDetailResponse, summary="이벤트 상세 조회")
async def get_admin_event(
    event_id: int,
    db: AsyncSessionDepends,
    actor: Admin = Depends(authenticate_admin_session),
):
    await ensure_admin_console_seed_data(db)
    try:
        event = await Event.get_by_id(db, event_id)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error

    return AdminEventDetailResponse(
        ok=True,
        message="이벤트 상세를 불러왔습니다.",
        event=await build_event_detail(db, event, actor),
    )


@admin_router.post("/events", response_model=AdminEventResponse, summary="이벤트 생성")
async def create_admin_event(
    payload: AdminEventUpsertRequest,
    db: AsyncSessionDepends,
    actor: Admin = Depends(authenticate_admin_session),
):
    try:
        publish_state = to_publish_state(payload.publish_state)
        validate_publish_transition(None, publish_state)
        slug = await ensure_unique_event_slug(db, payload.slug)
        start_time = payload.start_at
        end_time = payload.end_at
        validate_event_schedule(start_time, end_time)
        event = await Event.create(
            db,
            name=payload.name.strip(),
            slug=slug,
            location=payload.location.strip(),
            event_team=payload.event_team.strip(),
            start_time=start_time,
            end_time=end_time,
            admin_id=actor.id,
            admin_email=payload.admin_email.strip().lower(),
            bingo_size=payload.board_size,
            success_condition=payload.bingo_mission_count,
            keywords=[keyword.strip() for keyword in payload.keywords if keyword.strip()],
            publish_state=publish_state,
            first_published_at=resolve_first_published_at(None, publish_state, None),
        )
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error

    return AdminEventResponse(
        ok=True,
        message="이벤트를 생성했습니다.",
        event=await build_event_detail(db, event, actor),
    )


@admin_router.put("/events/{event_id}", response_model=AdminEventResponse, summary="이벤트 수정")
async def update_admin_event(
    event_id: int,
    payload: AdminEventUpsertRequest,
    db: AsyncSessionDepends,
    actor: Admin = Depends(authenticate_admin_session),
):
    try:
        event = await Event.get_by_id(db, event_id)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error

    if not can_edit_event(actor, event):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이 이벤트는 읽기 전용입니다.",
        )

    try:
        publish_state = to_publish_state(payload.publish_state)
        validate_publish_transition(event.publish_state, publish_state)
        slug = await ensure_unique_event_slug(db, payload.slug, current_event_id=event.id)
        validate_event_schedule(payload.start_at, payload.end_at)
        if event.publish_state == EventPublishState.PUBLISHED and event.slug != slug:
            raise ValueError("공개된 이후에는 slug를 변경할 수 없습니다.")

        updated_event = await Event.update(
            db,
            event_id=event.id,
            name=payload.name.strip(),
            slug=slug,
            location=payload.location.strip(),
            event_team=payload.event_team.strip(),
            start_time=payload.start_at,
            end_time=payload.end_at,
            admin_email=payload.admin_email.strip().lower(),
            bingo_size=payload.board_size,
            success_condition=payload.bingo_mission_count,
            keywords=[keyword.strip() for keyword in payload.keywords if keyword.strip()],
            publish_state=publish_state,
            first_published_at=resolve_first_published_at(
                event.publish_state,
                publish_state,
                event.first_published_at,
            ),
        )
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error

    return AdminEventResponse(
        ok=True,
        message="이벤트를 수정했습니다.",
        event=await build_event_detail(db, updated_event, actor),
    )


@admin_router.post(
    "/events/{event_id}/reset-data",
    response_model=AdminEventResetResponse,
    summary="이벤트 데이터 초기화",
)
async def reset_admin_event_data(
    event_id: int,
    db: AsyncSessionDepends,
    actor: Admin = Depends(authenticate_admin_session),
):
    try:
        event = await Event.get_by_id(db, event_id)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error

    if not can_edit_event(actor, event):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이 이벤트는 읽기 전용입니다.",
        )

    stats = await reset_event_runtime_data(db, event)
    return AdminEventResetResponse(
        ok=True,
        message="이벤트 데이터를 초기화했습니다.",
        stats=stats,
    )


@admin_router.post(
    "/zozo-manual-setting-bingo/{user_id}/{bingo_count}",
    summary="(관리자) 빙고 테스트 데이터 세팅",
    description="사용자 ID와 원하는 빙고 줄 수를 입력하여 빙고판 상태를 강제로 설정합니다. bingo_count를 0으로 설정 시 빙고판을 초기화합니다.",
    dependencies=[Depends(authenticate_user)],
)
async def set_bingo_test_route(
    db: AsyncSessionDepends,
    user_id: int,
    bingo_count: int
):
    try:
        updated_board = await set_test_bingo_board(db=db, user_id=user_id, bingo_count=bingo_count)
        return {
            "success": True,
            "message": f"사용자 {user_id}의 빙고가 {bingo_count}줄로 설정되었습니다.",
            "board_data": updated_board.board_data
        }
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"서버 오류가 발생했습니다: {error}") from error


@admin_router.get(
    "/download-attendance-data",
    summary="참여자 데이터 다운로드",
    dependencies=[Depends(authenticate_user)],
)
async def download_attendance_data(
    db: AsyncSessionDepends,
):
    users = await get_all_users(db)

    user_data = [
        {
            "ID": user.user_id,
            "Name": user.user_name,
            "LoginID": user.login_id,
            "Rating": user.rating,
            "Review": user.review,
            "AgreedAt": user.agreement_at.strftime('%Y-%m-%d %H:%M:%S') if user.agreement_at else None,
            "CreatedAt": user.created_at.strftime('%Y-%m-%d %H:%M:%S') if user.created_at else None,
        }
        for user in users
    ]

    df = pd.DataFrame(user_data)

    stream = io.StringIO()
    df.to_csv(stream, index=False, encoding='utf-8-sig')

    response = StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=attendance.csv"}
    )

    return response


@admin_router.get(
    "/download-bingo-participation-data",
    summary="빙고 참여 데이터 다운로드",
    dependencies=[Depends(authenticate_user)],
)
async def download_bingo_participation_data(
    db: AsyncSessionDepends,
):
    users = await get_all_users(db)
    boards = await get_all_bingo_boards(db)

    user_map = {user.user_id: user for user in users}
    board_map = {board.user_id: board for board in boards}

    participation_data = []
    for user_id, user in user_map.items():
        board = board_map.get(user_id)
        if board:
            selected_words = [cell['value'] for cell in board.board_data.values() if cell.get('selected')]
            participation_data.append({
                "ID": user.user_id,
                "Name": user.user_name,
                "LoginID": user.login_id,
                "BingoCount": board.bingo_count,
                "InteractionCount": board.user_interaction_count,
                "SelectedWords": ", ".join(selected_words) if selected_words else "",
            })

    df = pd.DataFrame(participation_data)

    stream = io.StringIO()
    df.to_csv(stream, index=False, encoding='utf-8-sig')

    response = StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=bingo_participation.csv"}
    )

    return response


@admin_router.get(
    "/download-all-interactions",
    summary="모든 인터랙션 데이터 다운로드",
    dependencies=[Depends(authenticate_user)],
)
async def download_all_interactions(
    db: AsyncSessionDepends,
):
    users = await get_all_users(db)
    boards = await get_all_bingo_boards(db)

    user_map = {user.user_id: user for user in users}

    grouped_interactions = {}

    for board in boards:
        receiver_user = user_map.get(board.user_id)
        if not receiver_user:
            continue

        for cell_data in board.board_data.values():
            sender_id = cell_data.get("interaction_id")
            keyword = cell_data.get("value")

            if sender_id and keyword:
                sender_user = user_map.get(sender_id)
                if not sender_user:
                    continue

                group_key = (receiver_user.user_id, sender_user.user_id)

                if group_key not in grouped_interactions:
                    grouped_interactions[group_key] = {
                        "ReceiverID": receiver_user.user_id,
                        "SenderID": sender_user.user_id,
                        "ReceiverName": receiver_user.user_name,
                        "SenderName": sender_user.user_name,
                        "Keywords": [],
                        "Timestamp": board.updated_at.strftime('%Y-%m-%d %H:%M:%S') if board.updated_at else None,
                    }

                grouped_interactions[group_key]["Keywords"].append(keyword)

    interaction_list = list(grouped_interactions.values())
    for item in interaction_list:
        item["Keyword"] = ", ".join(item.pop("Keywords"))

    if interaction_list:
        interaction_list.sort(
            key=lambda value: (
                value.get("Timestamp", ""),
                value.get("ReceiverName", ""),
                value.get("SenderName", ""),
            ),
            reverse=True,
        )

    df = pd.DataFrame(interaction_list)

    stream = io.StringIO()
    df.to_csv(stream, index=False, encoding='utf-8-sig')

    response = StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=all_interactions.csv"}
    )

    return response

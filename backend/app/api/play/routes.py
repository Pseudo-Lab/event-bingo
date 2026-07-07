import random
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from core.db import AsyncSessionDepends
from core.dependencies import get_current_user
from models.user import BingoUser
from models.event import Event, GameMode
from models.event_attendee import EventAttendee
from models.bingo.bingo_boards import BingoBoards
from models.team import Team, TeamColor
from models.room import Room
from api.admin.console_services import get_event_keyword_texts

from .schema import JoinEventResponse, RoomStatusResponse, TeamStatusItem, MyEventsResponse, MyEventItem, RoomTeamsResponse, TeamWithMembersItem, TeamMemberItem

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
    board_data = _build_board(get_event_keyword_texts(event.keywords), event.bingo_size)
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

    # Room + Event 단일 JOIN 쿼리
    room_event_row = await db.execute(
        sa_select(Room, Event).join(Event, Event.id == Room.event_id).where(Room.id == room_id)
    )
    result = room_event_row.one_or_none()
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="방을 찾을 수 없습니다.")
    room, event = result

    if event.game_mode != GameMode.TEAM:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="팀전 이벤트가 아닙니다.")

    # 팀 목록 + 팀별 인원수 단일 쿼리 — participant_count도 합산으로 계산
    team_count_rows = await db.execute(
        sa_select(Team, func.count(EventAttendee.id).label("member_count"))
        .outerjoin(EventAttendee, (EventAttendee.team_id == Team.id) & (EventAttendee.room_id == room_id))
        .where(Team.room_id == room_id)
        .group_by(Team.id)
    )
    rows = team_count_rows.all()
    team_items = [
        TeamStatusItem(
            team_id=team.id,
            color=team.color.value,
            name=team.name,
            member_count=count,
        )
        for team, count in rows
    ]
    participant_count = sum(count for _, count in rows)

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


@play_router.get(
    "/rooms/{room_id}/teams",
    response_model=RoomTeamsResponse,
    summary="방 내 팀 및 팀원 목록 조회",
)
async def get_room_teams(
    room_id: int,
    current_user: CurrentUser,
    db: AsyncSessionDepends,
):
    from sqlalchemy import select as sa_select

    room_event_row = await db.execute(
        sa_select(Room, Event).join(Event, Event.id == Room.event_id).where(Room.id == room_id)
    )
    result = room_event_row.one_or_none()
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="방을 찾을 수 없습니다.")
    room, event = result

    if event.game_mode != GameMode.TEAM:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="팀전 이벤트가 아닙니다.")

    # 방 전체 참석자 목록 1방에 조회
    attendees_result = await db.execute(
        sa_select(EventAttendee).where(EventAttendee.room_id == room_id)
    )
    attendees = attendees_result.scalars().all()

    user_ids = [a.user_id for a in attendees]

    user_map = {}
    board_map = {}

    if user_ids:
        # 유저 정보 일괄 조회
        users_result = await db.execute(
            sa_select(BingoUser).where(BingoUser.user_id.in_(user_ids))
        )
        user_map = {u.user_id: u for u in users_result.scalars().all()}

        # 빙고보드 정보 일괄 조회
        boards_result = await db.execute(
            sa_select(BingoBoards).where(
                BingoBoards.user_id.in_(user_ids),
                BingoBoards.event_id == room.event_id,
            )
        )
        board_map = {b.user_id: b for b in boards_result.scalars().all()}

    # 참석자 정보를 team_id 기준으로 그루핑
    team_members_by_team_id = {}
    for att in attendees:
        if att.team_id not in team_members_by_team_id:
            team_members_by_team_id[att.team_id] = []
        
        user = user_map.get(att.user_id)
        board = board_map.get(att.user_id)
        bingo_count = board.bingo_count if board else 0
        
        team_members_by_team_id[att.team_id].append(
            TeamMemberItem(
                user_id=att.user_id,
                user_name=user.user_name if user else None,
                bingo_count=bingo_count,
            )
        )

    # 방의 팀 목록 조회
    teams = await Team.get_by_room(db, room_id)
    team_with_members_items = []

    for team in teams:
        members = team_members_by_team_id.get(team.id, [])
        total_bingo = sum(m.bingo_count for m in members)
        
        team_with_members_items.append(
            TeamWithMembersItem(
                team_id=team.id,
                color=team.color.value,
                name=team.name,
                total_bingo_count=total_bingo,
                members=members,
            )
        )

    return RoomTeamsResponse(
        ok=True,
        message="방 내 팀 및 팀원 목록을 조회했습니다.",
        room_id=room_id,
        teams=team_with_members_items,
    )

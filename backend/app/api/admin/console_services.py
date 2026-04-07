from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from email.utils import formataddr
import hashlib
import os
import re
import secrets
import smtplib
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from zoneinfo import ZoneInfo

from sqlalchemy import delete, func, select

from core.db import AsyncSession
from models.admin import Admin, AdminRole
from models.bingo.bingo_boards import BingoBoards
from models.bingo.bingo_interaction import BingoInteraction
from models.event import Event, EventPublishState, EventStatus
from models.event_attendee import EventAttendee
from models.event_manager_request import EventManagerRequest, EventManagerRequestStatus
from models.policy_template import PolicyTemplate
from models.team import Team
from models.user import BingoUser

from .schema import (
    AdminEventAnalytics,
    AdminEventBingoRow,
    AdminEventDetail,
    AdminEventKeywordRow,
    AdminEventParticipantItem,
    AdminEventSummary,
    AdminEventManagerRequestItem,
    AdminMemberItem,
    AdminPolicyTemplateItem,
    AdminSessionInfo,
)


DEFAULT_ADMIN_PHONE = "010-0000-0000"
KST = ZoneInfo("Asia/Seoul")
RESERVED_EVENT_SLUGS = {"admin", "login", "bingo", "api", "assets"}
SLUG_PATTERN = re.compile(r"^[a-z0-9-]{3,50}$")
DEFAULT_ADMIN_PASSWORD = "Admin1234!"
ADMIN_INVITE_TOKEN_EXPIRE_HOURS = int(os.getenv("ADMIN_INVITE_TOKEN_EXPIRE_HOURS", "72"))
ADMIN_INVITE_URL_BASE = os.getenv("ADMIN_INVITE_URL_BASE", "http://localhost:5173/admin/invite")
ADMIN_SMTP_HOST = os.getenv("ADMIN_SMTP_HOST", "").strip()
ADMIN_SMTP_PORT = int(os.getenv("ADMIN_SMTP_PORT", "587"))
ADMIN_SMTP_USERNAME = os.getenv("ADMIN_SMTP_USERNAME", "").strip()
ADMIN_SMTP_PASSWORD = os.getenv("ADMIN_SMTP_PASSWORD", "")
ADMIN_SMTP_FROM_EMAIL = os.getenv("ADMIN_SMTP_FROM_EMAIL", "").strip()
ADMIN_SMTP_FROM_NAME = os.getenv("ADMIN_SMTP_FROM_NAME", "Bingo Networking Admin").strip()
ADMIN_SMTP_USE_TLS = os.getenv("ADMIN_SMTP_USE_TLS", "true").strip().lower() != "false"
ADMIN_SMTP_USE_SSL = os.getenv("ADMIN_SMTP_USE_SSL", "false").strip().lower() == "true"
LEGACY_SEED_ADMIN_EMAILS = {
    "manager@laivdata.com",
    "ops@laivdata.com",
    "admin@laivdata.com",
    "uni@laivdata.com",
}
LEGACY_SEED_EVENT_SLUGS = {
    "bingo-networking",
    "festival-naming-nnnnn",
    "campus-sprint-2026",
    "team-builder-beta",
}


@dataclass
class AdminInvitationResult:
    admin: Admin
    invite_link: str | None
    invite_expires_at: datetime | None
    invite_email_sent: bool
    created_admin: bool


def serialize_admin_session(admin: Admin) -> AdminSessionInfo:
    return AdminSessionInfo(
        id=admin.id,
        email=admin.email,
        name=admin.name,
        role=admin.role.value,
    )


def serialize_admin_member(admin: Admin) -> AdminMemberItem:
    return AdminMemberItem(
        id=admin.id,
        email=admin.email,
        name=admin.name,
        phone=DEFAULT_ADMIN_PHONE,
        created_at=admin.created_at,
        role=admin.role.value,
    )


async def serialize_policy_template(
    session: AsyncSession,
    template: PolicyTemplate,
) -> AdminPolicyTemplateItem:
    updated_by_name = None
    if template.updated_by_admin_id is not None:
        updated_by = await Admin.get_by_id(session, template.updated_by_admin_id)
        updated_by_name = updated_by.name

    return AdminPolicyTemplateItem(
        key=template.template_key,
        content=template.content_markdown,
        updated_at=template.updated_at,
        updated_by_name=updated_by_name,
    )


def can_edit_event(actor: Admin, event: Event) -> bool:
    return actor.role == AdminRole.ADMIN or actor.id == event.admin_id


def validate_event_schedule(start_at: datetime, end_at: datetime) -> None:
    if end_at <= start_at:
        raise ValueError("행사 종료 시각은 시작 시각보다 늦어야 합니다.")


def normalize_event_keywords(keywords: list[str] | None, board_size: int) -> list[str]:
    required_count = max(1, board_size * board_size)
    normalized_keywords: list[str] = []
    seen_keywords: set[str] = set()

    for keyword in keywords or []:
        normalized_keyword = keyword.strip()
        if not normalized_keyword or normalized_keyword in seen_keywords:
            continue

        normalized_keywords.append(normalized_keyword)
        seen_keywords.add(normalized_keyword)

        if len(normalized_keywords) >= required_count:
            return normalized_keywords

    generated_keywords = [
        f"키워드 {len(normalized_keywords) + index + 1}"
        for index in range(required_count - len(normalized_keywords))
    ]
    return [*normalized_keywords, *generated_keywords]


def validate_event_manager_request_transition(
    current_status: EventManagerRequestStatus,
    next_status: EventManagerRequestStatus,
) -> None:
    if current_status != EventManagerRequestStatus.PENDING:
        raise ValueError("이미 검토가 완료된 신청입니다.")

    if next_status == current_status:
        raise ValueError("같은 상태로는 다시 변경할 수 없습니다.")


def validate_admin_password(password: str) -> None:
    if len(password) < 8 or not any(character.isupper() for character in password):
        raise ValueError("비밀번호는 영어 대문자를 포함해 8자 이상이어야 합니다.")


def to_kst_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=KST)
    return value.astimezone(KST)


def hash_admin_invite_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def build_admin_invite_link(token: str) -> str:
    parsed_url = urlsplit(ADMIN_INVITE_URL_BASE)
    query_items = dict(parse_qsl(parsed_url.query, keep_blank_values=True))
    query_items["token"] = token
    return urlunsplit(
        (
            parsed_url.scheme,
            parsed_url.netloc,
            parsed_url.path,
            urlencode(query_items),
            parsed_url.fragment,
        )
    )


def _build_invitation_email(name: str, invite_link: str, expires_at: datetime) -> EmailMessage:
    message = EmailMessage()
    message["Subject"] = "[Bingo Networking] 이벤트 관리자 초대"
    message["From"] = formataddr((ADMIN_SMTP_FROM_NAME, ADMIN_SMTP_FROM_EMAIL or "no-reply@example.com"))
    expires_text = to_kst_datetime(expires_at).strftime("%Y-%m-%d %H:%M")
    message.set_content(
        "\n".join(
            [
                f"{name}님, 안녕하세요.",
                "",
                "이벤트 관리자 권한 신청이 승인되었습니다.",
                "아래 링크에서 비밀번호를 설정하면 관리자 콘솔에 로그인할 수 있습니다.",
                "",
                invite_link,
                "",
                f"링크 유효 시간: {expires_text} (KST)",
            ]
        )
    )
    return message


def send_admin_invitation_email(
    *,
    recipient_email: str,
    recipient_name: str,
    invite_link: str,
    expires_at: datetime,
) -> bool:
    if not ADMIN_SMTP_HOST or not ADMIN_SMTP_FROM_EMAIL:
        return False

    message = _build_invitation_email(recipient_name, invite_link, expires_at)
    message["To"] = recipient_email

    try:
        smtp_cls = smtplib.SMTP_SSL if ADMIN_SMTP_USE_SSL else smtplib.SMTP
        with smtp_cls(ADMIN_SMTP_HOST, ADMIN_SMTP_PORT, timeout=10) as server:
            if not ADMIN_SMTP_USE_SSL and ADMIN_SMTP_USE_TLS:
                server.starttls()
            if ADMIN_SMTP_USERNAME:
                server.login(ADMIN_SMTP_USERNAME, ADMIN_SMTP_PASSWORD)
            server.send_message(message)
        return True
    except Exception as error:  # pragma: no cover - external integration
        print(f"Failed to send admin invitation email: {error}")
        return False


async def serialize_event_manager_request(
    session: AsyncSession,
    request: EventManagerRequest,
) -> AdminEventManagerRequestItem:
    reviewed_by_name = None
    if request.reviewed_by_admin_id is not None:
        reviewed_by = await Admin.get_by_id(session, request.reviewed_by_admin_id)
        reviewed_by_name = reviewed_by.name

    return AdminEventManagerRequestItem(
        id=request.id,
        name=request.name,
        email=request.email,
        organization=request.organization,
        event_name=request.event_name,
        event_purpose=request.event_purpose,
        expected_event_date=request.expected_event_date,
        expected_attendee_count=request.expected_attendee_count,
        notes=request.notes,
        status=request.status.value,
        review_note=request.review_note,
        reviewed_at=request.reviewed_at,
        reviewed_by_name=reviewed_by_name,
        created_at=request.created_at,
    )


def validate_admin_member_deletion(
    actor: Admin,
    target: Admin,
    *,
    total_admin_count: int,
    owned_event_count: int,
) -> None:
    if actor.role != AdminRole.ADMIN:
        raise ValueError("관리자 권한이 필요합니다.")

    if actor.id == target.id:
        raise ValueError("본인 계정은 삭제할 수 없습니다.")

    if owned_event_count > 0:
        raise ValueError("생성한 이벤트가 있는 관리자는 삭제할 수 없습니다.")

    if target.role == AdminRole.ADMIN and total_admin_count <= 1:
        raise ValueError("최소 한 명의 Admin 계정은 남아 있어야 합니다.")


def validate_event_slug(slug: str) -> str:
    normalized_slug = slug.strip().lower()

    if not SLUG_PATTERN.fullmatch(normalized_slug):
        raise ValueError("slug는 한글, 영문 소문자, 숫자, 하이픈(-)만 사용해 3자 이상 50자 이하로 입력해 주세요.")

    if normalized_slug in RESERVED_EVENT_SLUGS:
        raise ValueError("예약된 slug는 사용할 수 없습니다.")

    return normalized_slug


def validate_publish_transition(
    current_state: EventPublishState | None,
    next_state: EventPublishState,
) -> None:
    if current_state is None:
        return

    allowed_transitions = {
        EventPublishState.DRAFT: {EventPublishState.DRAFT, EventPublishState.PUBLISHED, EventPublishState.ARCHIVED},
        EventPublishState.PUBLISHED: {EventPublishState.PUBLISHED, EventPublishState.ARCHIVED},
        EventPublishState.ARCHIVED: {EventPublishState.ARCHIVED},
    }

    if next_state not in allowed_transitions[current_state]:
        raise ValueError("현재 공개 상태에서는 요청한 상태로 변경할 수 없습니다.")


def resolve_event_status(event: Event) -> str:
    if event.status == EventStatus.FINISHED:
        return "ended"
    if event.status == EventStatus.IN_PROGRESS:
        return "in_progress"
    return "scheduled"


def resolve_progress_percent(bingo_count: int, success_condition: int) -> int:
    if success_condition <= 0:
        return 0

    return min(100, round((bingo_count / success_condition) * 100))


def resolve_operating_minutes(event: Event) -> int:
    if event.end_time and event.start_time:
        return max(0, int((event.end_time - event.start_time).total_seconds() // 60))

    fallback_end = event.start_time + timedelta(hours=6)
    return int((fallback_end - event.start_time).total_seconds() // 60)


def resolve_selected_keywords(attendee: EventAttendee, board: BingoBoards | None) -> list[str]:
    if attendee.selected_keywords:
        return [str(keyword) for keyword in attendee.selected_keywords]

    if board is None:
        return []

    selected_keywords: list[str] = []
    for cell in board.board_data.values():
        if cell.get("selected") in (1, True) and isinstance(cell.get("value"), str):
            selected_keywords.append(cell["value"])

    return selected_keywords


async def build_event_summary(
    session: AsyncSession,
    event: Event,
    actor: Admin,
) -> AdminEventSummary:
    creator = await Admin.get_by_id(session, event.admin_id)
    participant_count = await Event.get_participant_count(session, event.id)

    completed_result = await session.execute(
        select(func.count(EventAttendee.id))
        .join(BingoBoards, BingoBoards.user_id == EventAttendee.user_id)
        .where(
            EventAttendee.event_id == event.id,
            BingoBoards.bingo_count >= event.success_condition,
        )
    )
    progress_current = completed_result.scalar() or 0

    return AdminEventSummary(
        id=event.id,
        slug=event.slug,
        name=event.name,
        created_by_id=event.admin_id,
        created_by_email=creator.email,
        created_by_name=creator.name,
        location=event.location,
        event_team=event.event_team,
        start_at=event.start_time,
        end_at=event.end_time,
        admin_email=event.admin_email,
        board_size=event.bingo_size,
        bingo_mission_count=event.success_condition,
        keywords=[str(keyword) for keyword in (event.keywords or [])],
        participant_count=participant_count,
        progress_current=progress_current,
        progress_total=participant_count,
        status=resolve_event_status(event),
        publish_state=event.publish_state.value,
        can_edit=can_edit_event(actor, event),
    )


async def build_event_detail(
    session: AsyncSession,
    event: Event,
    actor: Admin,
) -> AdminEventDetail:
    attendee_rows = await session.execute(
        select(EventAttendee, BingoUser, BingoBoards)
        .join(BingoUser, BingoUser.user_id == EventAttendee.user_id)
        .outerjoin(BingoBoards, BingoBoards.user_id == EventAttendee.user_id)
        .where(EventAttendee.event_id == event.id)
        .order_by(EventAttendee.id.asc())
    )
    attendee_tuples = attendee_rows.all()

    participants: list[AdminEventParticipantItem] = []
    keyword_counter: Counter[str] = Counter()
    review_participants = 0
    review_score_total = 0
    total_keyword_selections = 0
    bingo_distribution: Counter[int] = Counter()

    for attendee, user, board in attendee_tuples:
        bingo_count = board.bingo_count if board else 0
        progress_percent = resolve_progress_percent(bingo_count, event.success_condition)
        keywords = resolve_selected_keywords(attendee, board)
        participants.append(
            AdminEventParticipantItem(
                id=user.user_id,
                name=user.user_name,
                user_code=user.login_id,
                progress_percent=progress_percent,
                keywords=keywords,
            )
        )

        keyword_counter.update(keywords)
        total_keyword_selections += board.user_interaction_count if board else 0

        capped_bingo_count = min(max(0, bingo_count), event.success_condition)
        bingo_distribution[capped_bingo_count] += 1

        if attendee.rating is not None:
            review_participants += 1
            review_score_total += attendee.rating

    participant_count = len(participants)
    average_review_score = (
        round(review_score_total / review_participants, 1) if review_participants > 0 else 0.0
    )
    participation_rate = round(
        (review_participants / participant_count) * 100, 1
    ) if participant_count > 0 else 0.0

    bingo_rows = [
        AdminEventBingoRow(
            line_label=f"{line_count}줄",
            count=bingo_distribution.get(line_count, 0),
            rate=round((bingo_distribution.get(line_count, 0) / participant_count) * 100, 1)
            if participant_count > 0
            else 0.0,
            is_complete=line_count == event.success_condition,
        )
        for line_count in range(event.success_condition + 1)
    ]

    keyword_rows = [
        AdminEventKeywordRow(rank=index, keyword=keyword, count=count)
        for index, (keyword, count) in enumerate(keyword_counter.most_common(5), start=1)
    ]

    summary = await build_event_summary(session, event, actor)
    return AdminEventDetail(
        **summary.model_dump(),
        public_path=f"/{event.slug}",
        participants=participants,
        analytics=AdminEventAnalytics(
            review_participants=review_participants,
            average_review_score=average_review_score,
            participation_rate=participation_rate,
            total_keyword_selections=total_keyword_selections,
            operating_minutes=resolve_operating_minutes(event),
            bingo_rows=bingo_rows,
            keyword_rows=keyword_rows,
        ),
    )


async def ensure_unique_event_slug(
    session: AsyncSession,
    slug: str,
    current_event_id: int | None = None,
) -> str:
    normalized_slug = validate_event_slug(slug)
    existing_event = await Event.get_by_slug(session, normalized_slug)
    if existing_event and existing_event.id != current_event_id:
        raise ValueError("이미 사용 중인 slug입니다.")

    return normalized_slug


async def reset_event_runtime_data(
    session: AsyncSession,
    event: Event,
) -> dict[str, int]:
    attendee_user_ids = (
        await session.execute(
            select(EventAttendee.user_id).where(EventAttendee.event_id == event.id)
        )
    ).scalars().all()

    unique_user_ids = sorted(set(attendee_user_ids))
    shared_user_ids = (
        await session.execute(
            select(EventAttendee.user_id)
            .where(
                EventAttendee.user_id.in_(unique_user_ids),
                EventAttendee.event_id != event.id,
            )
        )
    ).scalars().all() if unique_user_ids else []
    shared_user_id_set = set(shared_user_ids)
    resettable_user_ids = [
        user_id for user_id in unique_user_ids if user_id not in shared_user_id_set
    ]

    deleted_interactions = 0
    deleted_boards = 0
    deleted_users = 0

    if resettable_user_ids:
        interaction_result = await session.execute(
            delete(BingoInteraction).where(
                (BingoInteraction.send_user_id.in_(resettable_user_ids))
                | (BingoInteraction.receive_user_id.in_(resettable_user_ids))
            )
        )
        board_result = await session.execute(
            delete(BingoBoards).where(BingoBoards.user_id.in_(resettable_user_ids))
        )

        deleted_interactions = interaction_result.rowcount or 0
        deleted_boards = board_result.rowcount or 0

    attendee_result = await session.execute(
        delete(EventAttendee).where(EventAttendee.event_id == event.id)
    )
    team_result = await session.execute(delete(Team).where(Team.event_id == event.id))
    if resettable_user_ids:
        user_result = await session.execute(
            delete(BingoUser).where(BingoUser.user_id.in_(resettable_user_ids))
        )
        deleted_users = user_result.rowcount or 0
    await session.commit()

    return {
        "deleted_attendees": attendee_result.rowcount or 0,
        "deleted_teams": team_result.rowcount or 0,
        "deleted_users": deleted_users,
        "deleted_boards": deleted_boards,
        "deleted_interactions": deleted_interactions,
        "skipped_shared_users": len(shared_user_id_set),
    }


def resolve_first_published_at(
    current_state: EventPublishState | None,
    next_state: EventPublishState,
    existing_first_published_at: datetime | None,
) -> datetime | None:
    if current_state != EventPublishState.PUBLISHED and next_state == EventPublishState.PUBLISHED:
        return existing_first_published_at or datetime.now(timezone.utc)

    return existing_first_published_at


async def approve_event_manager_request(
    session: AsyncSession,
    request: EventManagerRequest,
) -> AdminInvitationResult:
    normalized_email = request.email.strip().lower()
    existing_admin = await Admin.get_by_email(session, normalized_email)

    if existing_admin and (
        existing_admin.role == AdminRole.ADMIN
        or (existing_admin.role == AdminRole.EVENT_MANAGER and not existing_admin.password_setup_required)
    ):
        return AdminInvitationResult(
            admin=existing_admin,
            invite_link=None,
            invite_expires_at=None,
            invite_email_sent=False,
            created_admin=False,
        )

    raw_invite_token = secrets.token_urlsafe(32)
    invite_token_hash = hash_admin_invite_token(raw_invite_token)
    invite_expires_at = datetime.now(KST) + timedelta(hours=ADMIN_INVITE_TOKEN_EXPIRE_HOURS)

    if existing_admin is None:
        provisioned_admin = await Admin.create(
            session,
            email=normalized_email,
            password=secrets.token_urlsafe(32) + "A1",
            name=request.name.strip(),
            role=AdminRole.EVENT_MANAGER,
            password_setup_required=True,
            invite_token_hash=invite_token_hash,
            invite_token_expires_at=invite_expires_at,
        )
        created_admin = True
    else:
        provisioned_admin = await Admin.store_invitation(
            session,
            existing_admin.id,
            invite_token_hash=invite_token_hash,
            invite_token_expires_at=invite_expires_at,
        )
        created_admin = False

    invite_link = build_admin_invite_link(raw_invite_token)
    invite_email_sent = send_admin_invitation_email(
        recipient_email=normalized_email,
        recipient_name=provisioned_admin.name,
        invite_link=invite_link,
        expires_at=invite_expires_at,
    )
    if invite_email_sent:
        provisioned_admin = await Admin.mark_invitation_sent(
            session,
            provisioned_admin.id,
            sent_at=datetime.now(KST),
        )

    return AdminInvitationResult(
        admin=provisioned_admin,
        invite_link=invite_link,
        invite_expires_at=invite_expires_at,
        invite_email_sent=invite_email_sent,
        created_admin=created_admin,
    )


async def get_invited_admin_by_token(
    session: AsyncSession,
    invite_token: str,
) -> Admin:
    token_hash = hash_admin_invite_token(invite_token.strip())
    admin = await Admin.get_by_invite_token_hash(session, token_hash)
    if not admin or not admin.invite_token_expires_at:
        raise ValueError("유효한 초대 링크를 찾을 수 없습니다.")

    if to_kst_datetime(admin.invite_token_expires_at) < datetime.now(KST):
        raise ValueError("초대 링크가 만료되었습니다. 관리자에게 재발송을 요청해 주세요.")

    return admin


async def complete_admin_invitation(
    session: AsyncSession,
    invite_token: str,
    password: str,
) -> Admin:
    validate_admin_password(password)
    invited_admin = await get_invited_admin_by_token(session, invite_token)
    return await Admin.complete_password_setup(
        session,
        invited_admin.id,
        password=password,
    )


async def ensure_admin_console_seed_data(session: AsyncSession) -> None:
    legacy_event_ids = (
        await session.execute(select(Event.id).where(Event.slug.in_(LEGACY_SEED_EVENT_SLUGS)))
    ).scalars().all()
    if legacy_event_ids:
        await session.execute(delete(EventAttendee).where(EventAttendee.event_id.in_(legacy_event_ids)))
        await session.execute(delete(Team).where(Team.event_id.in_(legacy_event_ids)))
        await session.execute(delete(Event).where(Event.id.in_(legacy_event_ids)))
        await session.commit()

    legacy_admin_ids = (
        await session.execute(
            select(Admin.id).where(
                Admin.email.in_(LEGACY_SEED_ADMIN_EMAILS),
                Admin.id.not_in(select(Event.admin_id)),
            )
        )
    ).scalars().all()
    if legacy_admin_ids:
        await session.execute(delete(Admin).where(Admin.id.in_(legacy_admin_ids)))
        await session.commit()



async def build_event_rooms(
    session: AsyncSession,
    event: Event,
) -> list[AdminRoomItem]:
    """이벤트의 방 목록을 빌드합니다 (팀전 전용).
    단일 JOIN 쿼리로 전체 방 + 참가자를 한 번에 조회합니다.
    """
    # 방 + 참가자 + 유저 + 팀을 단일 쿼리로 조회 (N+1 제거)
    rows = await session.execute(
        select(Room, EventAttendee, BingoUser, Team)
        .outerjoin(EventAttendee, EventAttendee.room_id == Room.id)
        .outerjoin(BingoUser, BingoUser.user_id == EventAttendee.user_id)
        .outerjoin(Team, Team.id == EventAttendee.team_id)
        .where(Room.event_id == event.id)
        .order_by(Room.id.asc(), EventAttendee.id.asc())
    )

    # 방별로 데이터 그루핑 (Python에서 처리)
    rooms_map: dict[int, tuple[Room, list[AdminRoomMemberItem]]] = {}
    for room, attendee, user, team in rows.all():
        if room.id not in rooms_map:
            rooms_map[room.id] = (room, [])
        if attendee is not None and user is not None:
            rooms_map[room.id][1].append(
                AdminRoomMemberItem(
                    user_id=user.user_id,
                    user_name=user.user_name,
                    team_color=team.color.value if team else None,
                )
            )

    return [
        AdminRoomItem(
            room_id=room.id,
            room_number=room.room_number,
            is_open=room.is_open,
            participant_count=len(members),
            members=members,
        )
        for room, members in rooms_map.values()
    ]


async def kick_event_attendee(
    session: AsyncSession,
    event: Event,
    user_id: int,
) -> int:
    """이벤트에서 특정 유저를 강제 퇴장시킵니다."""
    # 참가자 조회
    result = await session.execute(
        select(EventAttendee).where(
            EventAttendee.event_id == event.id,
            EventAttendee.user_id == user_id,
        )
    )
    attendee = result.scalar_one_or_none()
    if not attendee:
        raise ValueError(f"User {user_id}는 이 이벤트에 참가하고 있지 않습니다.")

    await session.delete(attendee)
    await session.commit()
    return user_id

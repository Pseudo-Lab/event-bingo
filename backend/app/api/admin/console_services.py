from collections import Counter

_seed_data_cleaned = False
from dataclasses import dataclass
from datetime import datetime, timedelta
from email.message import EmailMessage
from email.utils import formataddr
import os
import re
import secrets
import smtplib
from urllib.parse import urlsplit, urlunsplit
from zoneinfo import ZoneInfo

from sqlalchemy import and_, delete, func, select

from core.db import AsyncSession
from models.admin import Admin, AdminRole
from models.bingo.bingo_boards import BingoBoards
from models.bingo.bingo_interaction import BingoInteraction
from models.event import Event, EventStatus
from models.event_attendee import EventAttendee
from models.event_manager_request import EventManagerRequest, EventManagerRequestStatus
from models.policy_template import PolicyTemplate
from models.room import Room
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
    AdminRoomItem,
    AdminRoomMemberItem,
    AdminSessionInfo,
)


DEFAULT_ADMIN_PHONE = "010-0000-0000"
KST = ZoneInfo("Asia/Seoul")
PERSONAL_DATA_RETENTION_DAYS = max(1, int(os.getenv("PRIVACY_PERSONAL_DATA_RETENTION_DAYS", "365")))
PRIVACY_REDACTION_RUN_ON_STARTUP = (
    os.getenv("PRIVACY_REDACTION_RUN_ON_STARTUP", "false").strip().lower() == "true"
)
ARCHIVED_AUTH_PROVIDER = "archived"
ARCHIVED_PARTICIPANT_NAME_PREFIX = "익명 참가자"
ADMIN_CONSOLE_URL_BASE = os.getenv("ADMIN_CONSOLE_URL_BASE", "http://localhost:5173/admin").strip()
RESERVED_EVENT_SLUGS = {"admin", "login", "bingo", "api", "assets"}
SLUG_PATTERN = re.compile(r"^[a-z0-9\uAC00-\uD7A3-]{3,50}$")
DEFAULT_ADMIN_PASSWORD = "Admin1234!"
DEFAULT_BOOTSTRAP_ADMIN_EMAIL = "superadmin@laivdata.com"
DEFAULT_BOOTSTRAP_ADMIN_NAME = "어드민의 아버지"
ADMIN_INVITE_TOKEN_EXPIRE_HOURS = int(os.getenv("ADMIN_INVITE_TOKEN_EXPIRE_HOURS", "72"))
ADMIN_INVITE_URL_BASE = os.getenv("ADMIN_INVITE_URL_BASE", "http://localhost:5173/admin/invite")
ADMIN_SMTP_HOST = os.getenv("ADMIN_SMTP_HOST", "").strip()
ADMIN_SMTP_PORT = int(os.getenv("ADMIN_SMTP_PORT", "587"))
ADMIN_SMTP_USERNAME = os.getenv("ADMIN_SMTP_USERNAME", "").strip()
ADMIN_SMTP_PASSWORD = os.getenv("ADMIN_SMTP_PASSWORD", "")
ADMIN_SMTP_FROM_EMAIL = os.getenv("ADMIN_SMTP_FROM_EMAIL", "").strip()
ADMIN_SMTP_FROM_NAME = os.getenv("ADMIN_SMTP_FROM_NAME", "Bingo Networking Admin").strip()
ADMIN_SMTP_REPLY_TO = os.getenv("ADMIN_SMTP_REPLY_TO", ADMIN_SMTP_FROM_EMAIL).strip()
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


def normalize_kst_datetime(value: datetime | None) -> datetime:
    if value is None:
        return datetime.now(KST)
    if value.tzinfo is None:
        return value.replace(tzinfo=KST)
    return value.astimezone(KST)


def resolve_personal_data_cutoff(now: datetime | None = None) -> datetime:
    return normalize_kst_datetime(now) - timedelta(days=PERSONAL_DATA_RETENTION_DAYS)


def is_event_personal_data_expired(event: Event, now: datetime | None = None) -> bool:
    return normalize_kst_datetime(event.end_time) < resolve_personal_data_cutoff(now)


def build_archive_participant_alias(attendee_id: int) -> str:
    return f"{ARCHIVED_PARTICIPANT_NAME_PREFIX} {attendee_id}"


def build_archived_user_identifier(user_id: int) -> str:
    return f"archived-user-{user_id}"


@dataclass
class AdminInvitationResult:
    admin: Admin
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


def build_admin_console_link() -> str:
    if ADMIN_CONSOLE_URL_BASE:
        return ADMIN_CONSOLE_URL_BASE

    parsed_url = urlsplit("http://localhost:5173/admin")
    return urlunsplit((parsed_url.scheme, parsed_url.netloc, parsed_url.path, "", ""))


def _build_access_granted_email(name: str, console_url: str) -> EmailMessage:
    message = EmailMessage()
    message["Subject"] = "[Event Bingo] 관리자 권한이 승인되었습니다"
    message["From"] = formataddr((ADMIN_SMTP_FROM_NAME, ADMIN_SMTP_FROM_EMAIL or "no-reply@example.com"))
    if ADMIN_SMTP_REPLY_TO:
        message["Reply-To"] = ADMIN_SMTP_REPLY_TO
    message.set_content(
        "\n".join(
            [
                f"{name}님, 안녕하세요.",
                "",
                "DevFactory 운영팀입니다.",
                "Event Bingo 관리자 권한 신청이 승인되었습니다.",
                "이제 승인된 이메일로 Google 로그인하면 관리자 페이지에 접속할 수 있습니다.",
                "Gmail 주소가 아니어도 Google 계정에 연결된 이메일이면 사용할 수 있습니다.",
                "",
                console_url,
                "",
                f"문의가 있으면 {ADMIN_SMTP_REPLY_TO or ADMIN_SMTP_FROM_EMAIL}로 회신해 주세요.",
            ]
        )
    )
    return message


def send_admin_access_granted_email(
    *,
    recipient_email: str,
    recipient_name: str,
    console_url: str,
) -> bool:
    if not ADMIN_SMTP_HOST or not ADMIN_SMTP_FROM_EMAIL:
        return False

    message = _build_access_granted_email(recipient_name, console_url)
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
        print(f"Failed to send admin access granted email: {error}")
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


def resolve_participant_email(user: BingoUser, *, anonymized: bool = False) -> str:
    if anonymized:
        return "-"

    user_email = (user.user_email or "").strip()
    return user_email if "@" in user_email else "-"


def resolve_participant_name(
    user: BingoUser,
    board: BingoBoards | None,
    *,
    anonymized: bool = False,
    attendee_id: int | None = None,
) -> str:
    if anonymized:
        return build_archive_participant_alias(attendee_id or user.user_id)

    board_display_name = ((board.display_name or "").strip() if board else "")
    if board_display_name:
        return board_display_name

    user_name = (user.user_name or "").strip()
    if user_name:
        return user_name

    return f"참가자 {user.user_id}"


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


def build_admin_event_bingo_progress_query(event_ids: list[int]):
    return (
        select(EventAttendee.event_id, BingoBoards.bingo_count)
        .join(
            BingoBoards,
            and_(
                BingoBoards.user_id == EventAttendee.user_id,
                BingoBoards.event_id == EventAttendee.event_id,
            ),
        )
        .where(EventAttendee.event_id.in_(event_ids))
    )


async def build_event_summary(
    session: AsyncSession,
    event: Event,
    actor: Admin,
) -> AdminEventSummary:
    creator = await Admin.get_by_id(session, event.admin_id)
    participant_count = await Event.get_participant_count(session, event.id)

    completed_result = await session.execute(
        select(func.count(EventAttendee.id))
        .join(
            BingoBoards,
            and_(
                BingoBoards.user_id == EventAttendee.user_id,
                BingoBoards.event_id == EventAttendee.event_id,
            ),
        )
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
        game_mode=event.game_mode.value,
        team_size=event.team_size,
        participant_count=participant_count,
        progress_current=progress_current,
        progress_total=participant_count,
        status=resolve_event_status(event),
        can_edit=can_edit_event(actor, event),
    )


async def build_event_detail(
    session: AsyncSession,
    event: Event,
    actor: Admin,
) -> AdminEventDetail:
    anonymize_personal_data = is_event_personal_data_expired(event)
    attendee_rows = await session.execute(
        select(EventAttendee, BingoUser, BingoBoards)
        .join(BingoUser, BingoUser.user_id == EventAttendee.user_id)
        .outerjoin(
            BingoBoards,
            and_(
                BingoBoards.user_id == EventAttendee.user_id,
                BingoBoards.event_id == EventAttendee.event_id,
            ),
        )
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
                name=resolve_participant_name(
                    user,
                    board,
                    anonymized=anonymize_personal_data,
                    attendee_id=attendee.id,
                ),
                email=resolve_participant_email(user, anonymized=anonymize_personal_data),
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

    creator = await Admin.get_by_id(session, event.admin_id)
    progress_current = bingo_distribution.get(event.success_condition, 0)
    summary = AdminEventSummary(
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
        keywords=[str(k) for k in (event.keywords or [])],
        game_mode=event.game_mode.value,
        team_size=event.team_size,
        participant_count=participant_count,
        progress_current=progress_current,
        progress_total=participant_count,
        status=resolve_event_status(event),
        can_edit=can_edit_event(actor, event),
    )
    return AdminEventDetail(
        **summary.model_dump(),
        public_path=f"/event/{event.slug}",
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


async def redact_expired_event_personal_data(
    session: AsyncSession,
    *,
    now: datetime | None = None,
) -> dict[str, int]:
    cutoff = resolve_personal_data_cutoff(now)
    expired_event_ids = (
        await session.execute(select(Event.id).where(Event.end_time < cutoff))
    ).scalars().all()

    if not expired_event_ids:
        return {
            "expired_events": 0,
            "attendees_processed": 0,
            "board_names_redacted": 0,
            "attendee_reviews_cleared": 0,
            "users_redacted": 0,
            "users_skipped_due_to_recent_events": 0,
        }

    attendee_rows = await session.execute(
        select(EventAttendee, BingoUser, BingoBoards)
        .join(BingoUser, BingoUser.user_id == EventAttendee.user_id)
        .outerjoin(
            BingoBoards,
            and_(
                BingoBoards.user_id == EventAttendee.user_id,
                BingoBoards.event_id == EventAttendee.event_id,
            ),
        )
        .where(EventAttendee.event_id.in_(expired_event_ids))
        .order_by(EventAttendee.id.asc())
    )
    attendee_tuples = attendee_rows.all()
    if not attendee_tuples:
        return {
            "expired_events": len(expired_event_ids),
            "attendees_processed": 0,
            "board_names_redacted": 0,
            "attendee_reviews_cleared": 0,
            "users_redacted": 0,
            "users_skipped_due_to_recent_events": 0,
        }

    user_map = {user.user_id: user for _, user, _ in attendee_tuples}
    user_ids = sorted(user_map.keys())
    retained_user_ids = set()
    if user_ids:
        retained_rows = await session.execute(
            select(EventAttendee.user_id)
            .join(Event, Event.id == EventAttendee.event_id)
            .where(
                EventAttendee.user_id.in_(user_ids),
                Event.end_time >= cutoff,
            )
        )
        retained_user_ids = set(retained_rows.scalars().all())

    board_names_redacted = 0
    attendee_reviews_cleared = 0
    for attendee, _user, board in attendee_tuples:
        if attendee.review is not None:
            attendee.review = None
            attendee_reviews_cleared += 1

        if board is not None:
            alias = build_archive_participant_alias(attendee.id)
            if (board.display_name or "").strip() != alias:
                board.display_name = alias
                board_names_redacted += 1

    users_redacted = 0
    users_skipped = 0
    for user_id, user in user_map.items():
        if user_id in retained_user_ids:
            users_skipped += 1
            continue

        redacted_identifier = build_archived_user_identifier(user_id)
        changed = False
        if user.user_name is not None:
            user.user_name = None
            changed = True
        if user.user_email != redacted_identifier:
            user.user_email = redacted_identifier
            changed = True
        if user.login_id is not None:
            user.login_id = None
            changed = True
        if user.password_hash is not None:
            user.password_hash = None
            changed = True
        if user.provider_id is not None:
            user.provider_id = None
            changed = True
        if user.umoh_id is not None:
            user.umoh_id = None
            changed = True
        if user.review is not None:
            user.review = None
            changed = True
        if user.selected_words not in (None, []):
            user.selected_words = []
            changed = True
        if user.privacy_agreed:
            user.privacy_agreed = False
            changed = True
        if user.agreement_at is not None:
            user.agreement_at = None
            changed = True
        if user.auth_provider != ARCHIVED_AUTH_PROVIDER:
            user.auth_provider = ARCHIVED_AUTH_PROVIDER
            changed = True

        if changed:
            users_redacted += 1

    await session.commit()

    return {
        "expired_events": len(expired_event_ids),
        "attendees_processed": len(attendee_tuples),
        "board_names_redacted": board_names_redacted,
        "attendee_reviews_cleared": attendee_reviews_cleared,
        "users_redacted": users_redacted,
        "users_skipped_due_to_recent_events": users_skipped,
    }


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
            invite_email_sent=False,
            created_admin=False,
        )

    if existing_admin is None:
        provisioned_admin = await Admin.create(
            session,
            email=normalized_email,
            password=secrets.token_urlsafe(32) + "A1",
            name=request.name.strip(),
            role=AdminRole.EVENT_MANAGER,
            password_setup_required=False,
            invite_token_hash=None,
            invite_token_expires_at=None,
        )
        created_admin = True
    else:
        provisioned_admin = await Admin.update(
            session,
            existing_admin.id,
            name=request.name.strip() or existing_admin.name,
            role=existing_admin.role,
            password_setup_required=False,
            invite_token_hash=None,
            invite_token_expires_at=None,
            invitation_sent_at=None,
        )
        created_admin = False

    invite_email_sent = send_admin_access_granted_email(
        recipient_email=normalized_email,
        recipient_name=provisioned_admin.name,
        console_url=build_admin_console_link(),
    )
    if invite_email_sent:
        provisioned_admin = await Admin.mark_invitation_sent(
            session,
            provisioned_admin.id,
            sent_at=datetime.now(KST),
        )

    return AdminInvitationResult(
        admin=provisioned_admin,
        invite_email_sent=invite_email_sent,
        created_admin=created_admin,
    )


async def ensure_admin_console_seed_data(session: AsyncSession) -> None:
    global _seed_data_cleaned
    if _seed_data_cleaned:
        return

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

    _seed_data_cleaned = True



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

from core.db import AsyncSessionDepends
from core.log import logger
from models.event import Event
from models.event_attendee import EventAttendee
from models.user import BingoUser
from api.auth.schema import BingoUser as BingoUserResponse
from starlette.concurrency import run_in_threadpool


class BaseBingoUser:
    def __init__(self, session: AsyncSessionDepends):
        self.async_session = session

    async def ensure_event_attendee(self, user_id: int, event_slug: str | None) -> None:
        normalized_slug = (event_slug or "").strip().lower()
        if not normalized_slug:
            return

        event = await Event.get_by_slug(self.async_session, normalized_slug)
        if event is None:
            raise ValueError("이벤트를 찾을 수 없습니다.")

        try:
            await EventAttendee.create(self.async_session, event.id, user_id)
        except ValueError as error:
            if "이미 Event" not in str(error):
                raise


class RegisterBingoUser(BaseBingoUser):
    async def execute(
        self,
        username: str | None,
        password: str,
        event_slug: str | None = None,
        user_email: str | None = None,
        provider_id: str | None = None,
    ) -> BingoUser:
        try:
            normalized_username = (username or "").strip()
            normalized_password = password.strip()
            normalized_user_email = BingoUser.normalize_user_email(user_email)

            if len(normalized_username) == 0 and normalized_user_email is None:
                raise ValueError("이름을 입력해 주세요.")

            if len(normalized_password) < 4:
                raise ValueError("비밀번호는 4자 이상이어야 합니다.")

            user = await BingoUser.create(
                self.async_session,
                user_name=normalized_username or None,
                password=normalized_password,
                user_email=normalized_user_email,
                provider_id=provider_id,
            )
            await self.ensure_event_attendee(user.user_id, event_slug)
            logger.debug(f"Bingo user registered: {user}")

            return BingoUserResponse(
                **user.__dict__,
                ok=True,
                message="빙고 계정이 생성되었습니다.",
            )
        except ValueError as e:
            logger.info(str(e))
            return BingoUserResponse(ok=False, message=str(e))


class LoginBingoUser(BaseBingoUser):
    async def execute(
        self,
        login_id: str,
        password: str,
        event_slug: str | None = None,
        user_email: str | None = None,
        provider_id: str | None = None,
    ) -> BingoUser:
        try:
            normalized_login_id = login_id.strip().upper()
            normalized_password = password.strip()

            if len(normalized_login_id) == 0:
                raise ValueError("로그인 코드를 입력해 주세요.")

            if len(normalized_password) == 0:
                raise ValueError("비밀번호를 입력해 주세요.")

            user = await BingoUser.get_user_by_login_id(
                self.async_session,
                normalized_login_id,
            )

            if user is None:
                raise ValueError("존재하지 않는 로그인 코드입니다.")

            password_hash = user.password_hash
            # Release the read transaction before CPU-bound bcrypt work. Neither
            # a DB connection nor the event loop should wait for password hashing.
            await self.async_session.rollback()
            if not await run_in_threadpool(BingoUser.verify_password, normalized_password, password_hash):
                raise ValueError("비밀번호가 일치하지 않습니다.")

            user = await BingoUser.get_user_by_login_id(
                self.async_session, normalized_login_id, for_update=True
            )
            if user is None or user.password_hash != password_hash:
                raise ValueError("계정 정보가 변경되었습니다. 다시 로그인해 주세요.")

            identity_changed = False
            if provider_id and user.provider_id and user.provider_id != provider_id:
                raise ValueError("이미 다른 인증 계정에 연결된 빙고 계정입니다.")

            if provider_id and user.provider_id != provider_id:
                user.provider_id = provider_id
                user.auth_provider = "supabase"
                identity_changed = True

            user = await BingoUser.sync_user_email(
                self.async_session,
                user.user_id,
                user_email,
            )
            if identity_changed:
                await self.async_session.commit()
                await self.async_session.refresh(user)

            await self.ensure_event_attendee(user.user_id, event_slug)
            return BingoUserResponse(
                **user.__dict__,
                ok=True,
                message="로그인되었습니다.",
            )
        except ValueError as e:
            logger.info(str(e))
            return BingoUserResponse(ok=False, message=str(e))

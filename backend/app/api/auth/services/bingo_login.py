from core.db import AsyncSessionDepends
from core.log import logger
from models.user import BingoUser
from api.auth.schema import BingoUser as BingoUserResponse


class BaseBingoUser:
    def __init__(self, session: AsyncSessionDepends):
        self.async_session = session


class RegisterBingoUser(BaseBingoUser):
    async def execute(self, username: str, password: str) -> BingoUser:
        try:
            normalized_username = username.strip()
            normalized_password = password.strip()

            if len(normalized_username) == 0:
                raise ValueError("이름을 입력해 주세요.")

            if len(normalized_password) < 4:
                raise ValueError("비밀번호는 4자 이상이어야 합니다.")

            user = await BingoUser.create(
                self.async_session,
                user_name=normalized_username,
                password=normalized_password,
            )
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
    async def execute(self, login_id: str, password: str) -> BingoUser:
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

            if not BingoUser.verify_password(normalized_password, user.password_hash):
                raise ValueError("비밀번호가 일치하지 않습니다.")

            user = await BingoUser.update_privacy_agreement(
                self.async_session,
                user.user_id,
            )
            return BingoUserResponse(
                **user.__dict__,
                ok=True,
                message="로그인되었습니다.",
            )
        except ValueError as e:
            logger.info(str(e))
            return BingoUserResponse(ok=False, message=str(e))


class GetBingoUserByName(BaseBingoUser):
    async def execute(self, username: str) -> BingoUser:
        try:
            user = await BingoUser.get_user_by_name(self.async_session, username)
            if user is None:
                raise ValueError(f"{username} 가 존재하지 않습니다.")

            return BingoUserResponse(**user.__dict__, ok=True, message="빙고 유저 조회에 성공하였습니다.")
        except ValueError as e:
            return BingoUserResponse(ok=False, message=str(e))


class GetBingoUserById(BaseBingoUser):
    async def execute(self, user_id: int) -> BingoUser:
        try:
            user = await BingoUser.get_user_by_id(self.async_session, user_id)
            return BingoUserResponse(**user.__dict__, ok=True, message="빙고 유저 조회에 성공하였습니다.")
        except ValueError as e:
            return BingoUserResponse(ok=False, message=str(e))

from core.db import AsyncSessionDepends
from core.log import logger
from models.user import BingoUser
from api.auth.schema import BingoUser as BingoUserResponse


class BaseBingoUser:
    def __init__(self, session: AsyncSessionDepends):
        self.async_session = session


class LoginUser(BaseBingoUser):
    async def execute(self, email: str) -> BingoUser:
        try:
            # 사용자 생성 또는 조회
            user = await BingoUser.get_user_by_email(self.async_session, email)
            if not user:
                user = await BingoUser.create(self.async_session, email=email)
            logger.debug(f"User created or retrieved: {user}")

            return BingoUserResponse(**user.__dict__, ok=True, message="빙고 유저 생성에 성공하였습니다.")
        except ValueError as e:
            logger.info(str(e))
            return BingoUserResponse(ok=False, message=str(e))


class NewLoginUser(BaseBingoUser):
    async def execute(self, email: str, username: str) -> BingoUser:
        try:
            # 사용자 생성 또는 조회
            user = await BingoUser.get_user_by_email(self.async_session, email)
            if not user:
                user = await BingoUser.create_new(self.async_session, email=email, username=username)
            logger.debug(f"User created or retrieved: {user}")

            return BingoUserResponse(**user.__dict__, ok=True, message="빙고 유저 생성에 성공하였습니다.")
        except ValueError as e:
            logger.info(str(e))
            return BingoUserResponse(ok=False, message=str(e))


class GetBingoUserByName(BaseBingoUser):
    async def execute(self, username: str) -> BingoUser:
        try:
            user = await BingoUser.get_user_by_name(self.async_session, username)
            if user is None:
                raise ValueError(f"{user} 가 존재하지 않습니다.")

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

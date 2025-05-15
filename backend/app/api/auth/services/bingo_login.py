from core.db import AsyncSessionDepends
from core.log import logger
from models.user import BingoUser
from api.auth.schema import BingoUser as BingoUserResponse


class BaseBingoUser:
    def __init__(self, session: AsyncSessionDepends):
        self.async_session = session


class LoginUser(BaseBingoUser):
    async def execute(self, email: str, privacy_agreed: bool = False) -> BingoUser:
        try:
            # 사용자 조회
            user = await BingoUser.get_user_by_email(self.async_session, email)
            if not user:
                raise ValueError(
                    "입력하신 이메일은 행사에 등록된 정보와 일치하지 않습니다.\n"
                    "비회원으로 로그인 시, 빙고의 다양한 기능을 이용하실 수 없습니다.\n"
                    "원활한 이용을 위해, 수도콘 행사 신청 시 사용하신 이메일(우모 사이트 가입 이메일)로 로그인해 주세요.\n"
                    "이메일이 기억나지 않으신 경우, 수도콘 행사 페이지(우모)에서 확인해보시기 바랍니다."
                )

            return BingoUserResponse(**user.__dict__, ok=True, message="빙고 유저 생성에 성공하였습니다.")
        except ValueError as e:
            logger.info(str(e))
            return BingoUserResponse(ok=False, message=str(e))


class NewLoginUser(BaseBingoUser):
    async def execute(self, email: str, username: str, privacy_agreed: bool = False) -> BingoUser:
        try:
            # 사용자 생성 또는 조회
            user = await BingoUser.get_user_by_email(self.async_session, email)
            if not user:
                user = await BingoUser.create_new(self.async_session, email=email, user_name=username, privacy_agreed=privacy_agreed)
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

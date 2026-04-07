from core.db import AsyncSessionDepends
from core.log import logger
from models.bingo import BingoBoards
from models.event import Event
from models.user import BingoUser
from api.bingo.bingo_boards.schema import (
    BingoBoardResponse,
    GetUserBingoEventUser,
    UpdateBingoCountResponse,
    UpdateBingoStatusResponseByQRScan,
)


class BaseBingoBoard:
    def __init__(self, session: AsyncSessionDepends):
        self.async_session = session


class CreateBingoBoard(BaseBingoBoard):
    async def execute(self, user_id: int, board_data: dict, event_slug: str | None = None, display_name: str | None = None) -> BingoBoards:
        try:
            # event_slug로 event_id 조회
            event_id = 0
            if event_slug:
                event = await Event.get_by_slug(self.async_session, event_slug)
                if event:
                    event_id = event.id

            # 빙고판 생성 (display_name은 동명이인 접미사 자동 부여)
            res = await BingoBoards.create(self.async_session, user_id, event_id, board_data, display_name=display_name)

            # 선택된 단어들 업데이트
            selected_words = await BingoBoards.get_user_selected_words(self.async_session, user_id)
            logger.info(f"User {user_id} selected words: {selected_words}")
            await BingoUser.update_selected_words(self.async_session, user_id, selected_words)

            # 모든 작업이 완료된 후 commit
            await self.async_session.commit()

            return BingoBoardResponse(**res.__dict__, ok=True, message="빙고판 생성에 성공하였습니다.")
        except ValueError as e:
            await self.async_session.rollback()
            logger.error(f"Failed to create bingo board for user {user_id}: {str(e)}")
            return BingoBoardResponse(ok=False, message=str(e))


class GetBingoBoardByUserId(BaseBingoBoard):
    async def execute(self, user_id: int) -> BingoBoards:
        try:
            res = await BingoBoards.get_board_by_userid(self.async_session, user_id)
            return BingoBoardResponse(**res.__dict__, ok=True, message="빙고판 조회에 성공하였습니다.")
        except ValueError as e:
            return BingoBoardResponse(ok=False, message=str(e))


class UpdateBingoBoardByUserId(BaseBingoBoard):
    async def execute(self, user_id: int, board_data: dict) -> BingoBoards:
        try:
            res = await BingoBoards.update_board_by_userid(self.async_session, user_id, board_data)
            return BingoBoardResponse(**res.__dict__, ok=True, message="빙고판 수정에 성공하였습니다.")
        except ValueError as e:
            return BingoBoardResponse(ok=False, message=str(e))


class UpdateBingoCount(BaseBingoBoard):
    async def execute(self, user_id: int) -> bool:
        try:
            res = await BingoBoards.update_bingo_count(self.async_session, user_id)
            return UpdateBingoCountResponse(**res.__dict__, ok=True, message="빙고 갯수 업데이트에 성공하였습니다.")
        except ValueError as e:
            return UpdateBingoCountResponse(ok=False, message=str(e))


class GetBingoEventUser(BaseBingoBoard):
    async def execute(self, bingo_count: int) -> list[str]:
        try:
            res = await BingoBoards.get_bingo_event_users(self.async_session, bingo_count)
            return GetUserBingoEventUser(bingo_event_users=res, ok=True, message="빙고 이벤트 당첨 유저 목록 생성에 성공하였습니다.")
        except ValueError as e:
            return GetUserBingoEventUser(ok=False, message=str(e))
        
class UpdateBingoStatusByQRScan(BaseBingoBoard):
    async def execute(self, user_id: int, booth_id: int) -> BingoBoards:
        try:
            res = await BingoBoards.update_bingo_status_by_qr_scan(self.async_session, user_id, booth_id)
            return UpdateBingoStatusResponseByQRScan(**res.__dict__, ok=True, message="빙고판 상태 업데이트에 성공하였습니다.")
        except ValueError as e:
            return UpdateBingoStatusResponseByQRScan(ok=False, message=str(e))

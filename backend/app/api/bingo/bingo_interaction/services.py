from core.db import AsyncSessionDepends
from models.bingo import BingoInteraction
from api.bingo.bingo_boards.schema import BingoBoardResponse
from api.bingo.bingo_interaction.schema import BingoInteractionResponse, BingoInteractionListResponse


class BaseBingoInteraction:
    def __init__(self, session: AsyncSessionDepends):
        self.async_session = session


class CreateBingoInteraction(BaseBingoInteraction):
    async def execute(self, word_id_list: str, send_user_id: int, receive_user_id: int) -> BingoInteraction:
        try:
            interaction = await BingoInteraction.create(self.async_session, word_id_list, send_user_id, receive_user_id)
            return BingoBoardResponse(**interaction.__dict__, ok=True, message="빙고 인터렉션 생성에 성공하였습니다.")
        except ValueError as e:
            return BingoBoardResponse(ok=False, message=str(e))


class GetUserLatestInteraction(BaseBingoInteraction):
    async def execute(self, user_id: int) -> BingoInteraction:
        try:
            interaction = await BingoInteraction.get_user_latest_interaction(self.async_session, user_id)
            return BingoInteractionResponse(
                **interaction.__dict__, ok=True, message="유저의 최근 빙고 인터렉션 조회에 성공하였습니다."
            )
        except AttributeError as e:
            return BingoInteractionResponse(ok=False, message=str(e))


class GetUserAllInteractions(BaseBingoInteraction):
    async def execute(self, user_id: int) -> BingoInteractionListResponse:
        try:
            interactions = await BingoInteraction.get_user_all_interactions(self.async_session, user_id)
            return BingoInteractionListResponse(
                interactions=[
                    BingoInteractionResponse(
                        **interaction.__dict__,
                        ok=True,
                        message="유저의 빙고 인터렉션 조회에 성공하였습니다."
                    )
                    for interaction in interactions
                ],
                ok=True,
                message="유저의 모든 빙고 인터렉션 조회에 성공하였습니다."
            )
        except Exception as e:
            return BingoInteractionListResponse(
                interactions=[],
                ok=False,
                message=str(e)
            )

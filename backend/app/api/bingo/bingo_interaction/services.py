from sqlalchemy import select

from core.db import AsyncSessionDepends
from models.bingo import BingoBoards, BingoInteraction
from models.user import BingoUser
from api.bingo.bingo_interaction.schema import BingoInteractionResponse, BingoInteractionListResponse


class BaseBingoInteraction:
    def __init__(self, session: AsyncSessionDepends):
        self.async_session = session

    async def _build_user_name_map(self, interactions: list[BingoInteraction]) -> dict[int, str]:
        user_ids = {
            interaction.send_user_id for interaction in interactions
        } | {
            interaction.receive_user_id for interaction in interactions
        }

        if not user_ids:
            return {}

        res = await self.async_session.execute(
            select(BingoUser).where(BingoUser.user_id.in_(user_ids))
        )
        return {
            user.user_id: user.user_name
            for user in res.scalars().all()
        }

    async def _serialize_interactions(
        self,
        interactions: list[BingoInteraction],
        success_message: str,
    ) -> list[BingoInteractionResponse]:
        user_name_map = await self._build_user_name_map(interactions)

        return [
            BingoInteractionResponse(
                **interaction.__dict__,
                send_user_name=user_name_map.get(interaction.send_user_id),
                receive_user_name=user_name_map.get(interaction.receive_user_id),
                ok=True,
                message=success_message,
            )
            for interaction in interactions
        ]


class CreateBingoInteraction(BaseBingoInteraction):
    async def execute(
        self,
        word_id_list: str,
        send_user_id: int,
        receive_user_id: int,
    ) -> BingoInteractionResponse:
        try:
            if send_user_id == receive_user_id:
                return BingoInteractionResponse(
                    ok=False,
                    message="보내는 계정과 받는 계정이 같습니다.",
                )

            is_duplicate = await BingoInteraction.has_directional_interaction(
                self.async_session,
                send_user_id=send_user_id,
                receive_user_id=receive_user_id,
            )
            if is_duplicate:
                return BingoInteractionResponse(
                    ok=False,
                    message="이미 동일한 참가자에게 키워드를 전달한 적이 있습니다.",
                )

            send_user = await BingoUser.get_user_by_id(self.async_session, send_user_id)
            receive_user = await BingoUser.get_user_by_id(self.async_session, receive_user_id)
            board = await BingoBoards.get_board_by_userid(self.async_session, receive_user_id)
            selected_words = await BingoBoards.get_user_selected_words(self.async_session, send_user_id)

            if any(
                cell_data.get("interaction_id") == send_user_id
                for cell_data in board.board_data.values()
            ):
                return BingoInteractionResponse(
                    ok=False,
                    message="이미 동일한 참가자에게 키워드를 전달한 적이 있습니다.",
                )

            updated_words: list[str] = []
            for cell_data in board.board_data.values():
                if cell_data.get("status") == 0 and cell_data.get("value") in selected_words:
                    cell_data["status"] = 1
                    cell_data["interaction_id"] = send_user_id
                    updated_words.append(cell_data["value"])

            if updated_words:
                await BingoBoards.update_board_by_userid(
                    self.async_session,
                    receive_user_id,
                    dict(board.board_data),
                )

            board.user_interaction_count += 1
            board = await BingoBoards.update_bingo_count(self.async_session, receive_user_id)
            interaction = await BingoInteraction.create(
                self.async_session,
                word_id_list,
                send_user_id,
                receive_user_id,
            )

            return BingoInteractionResponse(
                **interaction.__dict__,
                updated_words=updated_words,
                bingo_count=board.bingo_count,
                send_user_name=send_user.user_name,
                receive_user_name=receive_user.user_name,
                ok=True,
                message="빙고 키워드 전송에 성공하였습니다.",
            )
        except ValueError as e:
            await self.async_session.rollback()
            return BingoInteractionResponse(ok=False, message=str(e))
        except Exception as e:
            await self.async_session.rollback()
            return BingoInteractionResponse(ok=False, message=str(e))


class GetUserLatestInteraction(BaseBingoInteraction):
    async def execute(self, user_id: int, limit: int) -> list[BingoInteractionResponse] | BingoInteractionResponse:
        try:
            interactions = await BingoInteraction.get_user_latest_interaction(self.async_session, user_id, limit)
            responses = await self._serialize_interactions(
                interactions,
                "유저의 최근 빙고 인터렉션 조회에 성공하였습니다.",
            )

            return responses
        except AttributeError as e:
            return BingoInteractionResponse(ok=False, message=str(e))


class GetUserAllInteractions(BaseBingoInteraction):
    async def execute(
        self,
        user_id: int,
        after_interaction_id: int | None = None,
    ) -> BingoInteractionListResponse:
        try:
            interactions = await BingoInteraction.get_user_all_interactions(
                self.async_session,
                user_id,
                after_interaction_id=after_interaction_id,
            )
            serialized_interactions = await self._serialize_interactions(
                interactions,
                "유저의 빙고 인터렉션 조회에 성공하였습니다.",
            )
            return BingoInteractionListResponse(
                interactions=serialized_interactions,
                ok=True,
                message="유저의 모든 빙고 인터렉션 조회에 성공하였습니다."
            )
        except Exception as e:
            return BingoInteractionListResponse(
                interactions=[],
                ok=False,
                message=str(e)
            )

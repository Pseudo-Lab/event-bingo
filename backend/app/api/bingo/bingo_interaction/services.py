from sqlalchemy import select

from core.db import AsyncSessionDepends
from models.bingo import BingoBoards, BingoInteraction
from models.event import Event
from models.user import BingoUser
from api.bingo.bingo_interaction.schema import BingoInteractionResponse, BingoInteractionListResponse


class BaseBingoInteraction:
    def __init__(self, session: AsyncSessionDepends):
        self.async_session = session

    async def _resolve_event_id(self, event_slug: str | None) -> int | None:
        normalized_slug = (event_slug or "").strip().lower()
        if not normalized_slug:
            return None

        event = await Event.get_by_slug(self.async_session, normalized_slug)
        if not event:
            raise ValueError("이벤트를 찾을 수 없습니다.")

        return event.id

    async def _build_name_maps(
        self,
        interactions: list[BingoInteraction],
    ) -> tuple[dict[int, str], dict[tuple[int, int], str]]:
        user_ids = {
            interaction.send_user_id for interaction in interactions
        } | {
            interaction.receive_user_id for interaction in interactions
        }
        event_ids = {
            interaction.event_id
            for interaction in interactions
            if getattr(interaction, "event_id", None) is not None
        }

        if not user_ids:
            return {}, {}

        board_display_name_map: dict[tuple[int, int], str] = {}
        if event_ids:
            boards_result = await self.async_session.execute(
                select(BingoBoards).where(
                    BingoBoards.user_id.in_(user_ids),
                    BingoBoards.event_id.in_(event_ids),
                )
            )
            board_display_name_map = {
                (board.user_id, board.event_id): board.display_name.strip()
                for board in boards_result.scalars().all()
                if (board.display_name or "").strip()
            }

        res = await self.async_session.execute(
            select(BingoUser).where(BingoUser.user_id.in_(user_ids))
        )
        user_name_map = {
            user.user_id: user.user_name
            for user in res.scalars().all()
        }
        return user_name_map, board_display_name_map

    @staticmethod
    def _resolve_user_name(
        user_id: int,
        event_id: int | None,
        user_name_map: dict[int, str],
        board_display_name_map: dict[tuple[int, int], str],
    ) -> str | None:
        if event_id is not None:
            board_display_name = board_display_name_map.get((user_id, event_id))
            if board_display_name:
                return board_display_name

        return user_name_map.get(user_id)

    async def _serialize_interactions(
        self,
        interactions: list[BingoInteraction],
        success_message: str,
    ) -> list[BingoInteractionResponse]:
        user_name_map, board_display_name_map = await self._build_name_maps(interactions)

        return [
            BingoInteractionResponse(
                **interaction.__dict__,
                send_user_name=self._resolve_user_name(
                    interaction.send_user_id,
                    interaction.event_id,
                    user_name_map,
                    board_display_name_map,
                ),
                receive_user_name=self._resolve_user_name(
                    interaction.receive_user_id,
                    interaction.event_id,
                    user_name_map,
                    board_display_name_map,
                ),
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
        event_slug: str | None = None,
    ) -> BingoInteractionResponse:
        try:
            if send_user_id == receive_user_id:
                return BingoInteractionResponse(
                    ok=False,
                    message="보내는 계정과 받는 계정이 같습니다.",
                )

            event_id = await self._resolve_event_id(event_slug)
            prefetched_receiver_board = None
            if event_id is None:
                prefetched_receiver_board = await BingoBoards.get_board_by_userid(self.async_session, receive_user_id)
                event_id = prefetched_receiver_board.event_id

            # 유저 두 명 + 보드 두 개를 각각 단일 IN 쿼리로 조회
            users_result = await self.async_session.execute(
                select(BingoUser).where(BingoUser.user_id.in_([send_user_id, receive_user_id]))
            )
            users = {u.user_id: u for u in users_result.scalars().all()}
            send_user = users.get(send_user_id)
            receive_user = users.get(receive_user_id)

            if prefetched_receiver_board is not None:
                # event_id를 receiver_board에서 얻은 경우 sender 보드만 추가 조회
                sender_board = await BingoBoards.get_board_by_userid(self.async_session, send_user_id, event_id)
                board = prefetched_receiver_board
            else:
                # sender/receiver 보드를 단일 IN 쿼리로 배치 조회
                boards_result = await self.async_session.execute(
                    select(BingoBoards).where(
                        BingoBoards.user_id.in_([send_user_id, receive_user_id]),
                        BingoBoards.event_id == event_id,
                    )
                )
                boards = {b.user_id: b for b in boards_result.scalars().all()}
                board = boards.get(receive_user_id)
                sender_board = boards.get(send_user_id)

            selected_words = [
                cell.get("value")
                for cell in (sender_board.board_data.values() if sender_board else [])
                if cell.get("selected") in (1, True) and cell.get("value")
            ]

            # DB 중복 체크 제거 — board_data에서 Python으로 판단 (동일 결과)
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
                    event_id,
                )

            board.user_interaction_count += 1
            board = await BingoBoards.update_bingo_count(self.async_session, receive_user_id, event_id)
            interaction = await BingoInteraction.create(
                self.async_session,
                word_id_list,
                send_user_id,
                receive_user_id,
                event_id=event_id,
            )

            return BingoInteractionResponse(
                **interaction.__dict__,
                updated_words=updated_words,
                bingo_count=board.bingo_count,
                send_user_name=((sender_board.display_name or "").strip() if sender_board else "")
                or send_user.user_name,
                receive_user_name=((board.display_name or "").strip() if board else "")
                or receive_user.user_name,
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
    async def execute(
        self,
        user_id: int,
        limit: int,
        event_slug: str | None = None,
    ) -> list[BingoInteractionResponse] | BingoInteractionResponse:
        try:
            event_id = await self._resolve_event_id(event_slug)
            interactions = await BingoInteraction.get_user_latest_interaction(
                self.async_session,
                user_id,
                limit,
                event_id=event_id,
            )
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
        event_slug: str | None = None,
        after_interaction_id: int | None = None,
    ) -> BingoInteractionListResponse:
        try:
            event_id = await self._resolve_event_id(event_slug)
            interactions = await BingoInteraction.get_user_all_interactions(
                self.async_session,
                user_id,
                after_interaction_id=after_interaction_id,
                event_id=event_id,
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

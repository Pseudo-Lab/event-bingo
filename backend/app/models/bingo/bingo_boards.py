from datetime import datetime
from zoneinfo import ZoneInfo
import asyncio
import random

from sqlalchemy.orm import mapped_column
from sqlalchemy import Integer, DateTime, JSON, ForeignKey, PrimaryKeyConstraint, select, desc
from sqlalchemy.ext.mutable import MutableDict

from core.db import AsyncSession
from models.base import Base
from models.bingo.schema import BingoEventUserInfo, BingoQRScanSchema
from models.user import BingoUser


class BingoBoards(Base):
    __tablename__ = "bingo_boards"
    __table_args__ = (
        PrimaryKeyConstraint("user_id", "event_id", name="pk_bingo_boards"),
    )

    user_id = mapped_column(Integer, nullable=False)
    event_id = mapped_column(Integer, ForeignKey("events.id"), nullable=True)
    board_data = mapped_column(MutableDict.as_mutable(JSON), nullable=False)

    bingo_count = mapped_column(Integer, default=0, nullable=False)
    user_interaction_count = mapped_column(Integer, default=0, nullable=False)
    created_at = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(ZoneInfo("Asia/Seoul")), nullable=False
    )
    updated_at = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(ZoneInfo("Asia/Seoul")),
        onupdate=lambda: datetime.now(ZoneInfo("Asia/Seoul")),
        nullable=False,
    )

    @classmethod
    async def create(cls, session: AsyncSession, user_id: int, event_id: int, board_data: dict):
        existing = await session.execute(
            select(cls).where(cls.user_id == user_id, cls.event_id == event_id)
        )
        if existing.scalar_one_or_none():
            raise ValueError(f"{user_id} 의 빙고판은 이미 존재합니다.")
        new_status = BingoBoards(user_id=user_id, event_id=event_id, board_data=board_data)
        session.add(new_status)
        await session.commit()
        created_status = await cls.get_board(session, user_id, event_id)
        return created_status

    @classmethod
    async def get_board(cls, session: AsyncSession, user_id: int, event_id: int):
        res = await session.execute(
            select(cls).where(cls.user_id == user_id, cls.event_id == event_id)
        )
        board = res.scalar_one_or_none()
        if not board:
            raise ValueError(f"{user_id} 의 빙고판이 존재하지 않습니다.")
        return board

    # 하위 호환용 alias (Task 8 전까지 기존 서비스 코드에서 사용)
    @classmethod
    async def get_board_by_userid(cls, session: AsyncSession, user_id: int, event_id: int = None):
        if event_id is not None:
            return await cls.get_board(session, user_id, event_id)
        # event_id 없이 호출 시: 해당 user의 가장 최근 빙고판 반환 (레거시 동작)
        res = await session.execute(
            select(cls).where(cls.user_id == user_id).order_by(cls.created_at.desc()).limit(1)
        )
        board = res.scalar_one_or_none()
        if not board:
            raise ValueError(f"{user_id} 의 빙고판이 존재하지 않습니다.")
        return board

    @classmethod
    async def update_board_by_userid(cls, session: AsyncSession, user_id: int, board_data: dict, event_id: int = None):
        board = await cls.get_board_by_userid(session, user_id, event_id)
        board.board_data.update(board_data)
        return board

    @classmethod
    async def update_board_interaction_count_by_userid(cls, session: AsyncSession, user_id: int, interaction_cnt: int, event_id: int = None):
        board = await cls.get_board_by_userid(session, user_id, event_id)
        board.user_interaction_count = interaction_cnt
        session.add(board)
        await session.commit()

    @classmethod
    async def update_bingo_count(cls, session: AsyncSession, user_id: int, event_id: int = None):
        board = await cls.get_board_by_userid(session, user_id, event_id)

        board_data = board.board_data
        num_cells = len(board_data) + 1
        size = int(num_cells ** 0.5)
        bingo = 0
        bingo_board = [[board_data[str(i * size + j)]["status"] for j in range(size)] for i in range(size)]

        for row in bingo_board:  # 가로
            if all(status == 1 for status in row):
                bingo += 1

        for col in zip(*bingo_board):  # 세로
            if all(status == 1 for status in col):
                bingo += 1

        if all(bingo_board[i][i] == 1 for i in range(size)):  # 대각선 왼 -> 오
            bingo += 1

        if all(bingo_board[i][size - 1 - i] == 1 for i in range(size)):  # 대각선 오 -> 왼
            bingo += 1

        board.bingo_count = bingo

        return board

    @classmethod
    async def get_user_selected_words(cls, session: AsyncSession, user_id: int, event_id: int = None):
        board = await cls.get_board_by_userid(session, user_id, event_id)

        board_data = board.board_data
        selected_words = []
        for board_block in board_data.values():
            if board_block.get("selected") == 1:
                selected_words.append(board_block.get("value"))

        return selected_words

    @classmethod
    async def get_bingo_event_users(cls, session: AsyncSession, bingo_count: int) -> list:
        query = select(cls).filter(cls.bingo_count >= bingo_count).order_by(desc(cls.bingo_count))
        result = await session.execute(query)
        bingo_event_users = [(board.user_id, board.bingo_count) for board in result.scalars().all()]

        selected_users_info = await asyncio.gather(
            *[BingoUser.get_user_by_id(session, user_id) for user_id, _ in bingo_event_users]
        )
        bingo_event_users_info = [
            BingoEventUserInfo(rank=idx, user_name=user_info.username, bingo_count=bingo_count)
            for idx, ((_, bingo_count), user_info) in enumerate(zip(bingo_event_users, selected_users_info), start=1)
        ]

        return bingo_event_users_info

    @classmethod
    async def update_bingo_status_by_qr_scan(cls, session: AsyncSession, user_id: int, booth_id: int, event_id: int = None):
        booth_exist = False
        not_selected_ids = []
        # get board_data, check user_id is already have booth bingo
        board = await cls.get_board_by_userid(session, user_id, event_id)
        board_data = board.board_data
        updated_booth_name = f"Booth {booth_id}"
        for idx, bingo_dict in board_data.items():
            value, status = bingo_dict["value"], bingo_dict["status"]
            if value == updated_booth_name:
                booth_exist = True
                break
            if status == 0:
                # get not selected list
                not_selected_ids.append(idx)

        if not booth_exist:
            # update random board data
            booth_idx = random.choice(not_selected_ids)
            board_data[booth_idx]["value"] = updated_booth_name
            board_data[booth_idx]["status"] = 1
            await cls.update_board_by_userid(session, user_id, board_data, event_id)
            board = await cls.update_bingo_count(session, user_id, event_id)

        return BingoQRScanSchema(
            user_id=user_id,
            booth_id=booth_id,
            updated_words=[updated_booth_name],
            bingo_count=board.bingo_count,
        )

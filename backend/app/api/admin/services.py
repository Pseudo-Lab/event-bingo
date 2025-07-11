from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy import select
from core.db import AsyncSession
from models.user import BingoUser
from models.bingo.bingo_boards import BingoBoards
from typing import List


async def set_test_bingo_board(db: AsyncSession, user_id: int, bingo_count: int) -> BingoBoards:
    """
    (비동기) 사용자의 빙고 보드를 테스트용으로 설정합니다.
    bingo_count 수만큼 가로줄을 완성시킵니다.
    """
    # 1. 유저의 빙고판 조회 (비동기 방식)
    result = await db.execute(select(BingoBoards).filter(BingoBoards.user_id == user_id))
    board = result.scalar_one_or_none()

    if not board:
        raise ValueError("해당 사용자의 빙고 보드를 찾을 수 없습니다.")

    data = board.board_data

    # 빙고판 크기 동적 계산
    num_cells = len(data)
    row_size = int(num_cells ** 0.5)

    # 2. 빙고판 초기화 및 재설정
    # 모든 status를 0으로 초기화
    for i in range(num_cells):
        if str(i) in data:
            data[str(i)]["status"] = 0

    # bingo_count만큼 가로줄 완성
    if bingo_count > 0:
        for i in range(bingo_count):
            for j in range(row_size):
                idx = i * row_size + j
                if str(idx) in data:
                    data[str(idx)]["status"] = 1

    board.bingo_count = bingo_count

    # 3. DB에 저장
    flag_modified(board, "board_data")
    await db.commit()
    await db.refresh(board)

    return board


async def get_all_users(db: AsyncSession) -> List[BingoUser]:
    """
    모든 유저 정보를 조회합니다.
    """
    result = await db.execute(select(BingoUser))
    users = result.scalars().all()
    return users


async def get_all_bingo_boards(db: AsyncSession) -> List[BingoBoards]:
    """
    모든 유저의 빙고 보드 정보를 조회합니다.
    """
    result = await db.execute(select(BingoBoards))
    boards = result.scalars().all()
    return boards
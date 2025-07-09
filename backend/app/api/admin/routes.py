from fastapi import APIRouter, HTTPException
from core.db import AsyncSessionDepends
from .services import set_test_bingo_board

admin_router = APIRouter(prefix="/admin", tags=["admin"])

@admin_router.post(
    "/zozo-manual-setting-bingo/{user_id}/{bingo_count}",
    summary="(관리자) 빙고 테스트 데이터 세팅",
    description="사용자 ID와 원하는 빙고 줄 수를 입력하여 빙고판 상태를 강제로 설정합니다. bingo_count를 0으로 설정 시 빙고판을 초기화합니다.",
)
async def set_bingo_test_route(
    db: AsyncSessionDepends,
    user_id: int,
    bingo_count: int
):
    """
    관리자용 빙고 테스트 API 엔드포인트입니다.
    """
    try:
        updated_board = await set_test_bingo_board(db=db, user_id=user_id, bingo_count=bingo_count)
        return {
            "success": True,
            "message": f"사용자 {user_id}의 빙고가 {bingo_count}줄로 설정되었습니다.",
            "board_data": updated_board.board_data
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"서버 오류가 발생했습니다: {e}")

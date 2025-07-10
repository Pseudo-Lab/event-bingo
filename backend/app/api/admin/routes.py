from fastapi import APIRouter, HTTPException, Depends
from core.db import AsyncSessionDepends
from .services import set_test_bingo_board, get_all_users, get_all_bingo_boards
from core.dependencies import authenticate_user

import io
import pandas as pd
from starlette.responses import StreamingResponse

admin_router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(authenticate_user)])

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


@admin_router.get("/download-attendance-data", summary="참여자 데이터 다운로드")
async def download_attendance_data(
    db: AsyncSessionDepends,
):
    """
    참여자 데이터를 CSV 파일로 다운로드합니다.
    """
    users = await get_all_users(db)
    
    user_data = [
        {
            "ID": user.user_id,
            "Name": user.user_name,
            "Email": user.user_email,
            "Rating": user.rating,
            "Review": user.review,
            "AgreedAt": user.agreement_at.strftime('%Y-%m-%d %H:%M:%S') if user.agreement_at else None,
            "CreatedAt": user.created_at.strftime('%Y-%m-%d %H:%M:%S') if user.created_at else None,
        }
        for user in users
    ]
    
    df = pd.DataFrame(user_data)
    
    stream = io.StringIO()
    df.to_csv(stream, index=False, encoding='utf-8-sig')
    
    response = StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=attendance.csv"}
    )
    
    return response


@admin_router.get("/download-bingo-participation-data", summary="빙고 참여 데이터 다운로드")
async def download_bingo_participation_data(
    db: AsyncSessionDepends,
):
    """
    참여자들의 주요 빙고 참여 데이터를 CSV 파일로 다운로드합니다.
    """
    users = await get_all_users(db)
    boards = await get_all_bingo_boards(db)

    user_map = {user.user_id: user for user in users}
    board_map = {board.user_id: board for board in boards}

    participation_data = []
    for user_id, user in user_map.items():
        board = board_map.get(user_id)
        if board:
            selected_words = [cell['value'] for cell in board.board_data.values() if cell.get('selected')]
            participation_data.append({
                "ID": user.user_id,
                "Name": user.user_name,
                "Email": user.user_email,
                "BingoCount": board.bingo_count,
                "InteractionCount": board.user_interaction_count,
                "SelectedWords": ", ".join(selected_words) if selected_words else "",
            })

    df = pd.DataFrame(participation_data)

    stream = io.StringIO()
    df.to_csv(stream, index=False, encoding='utf-8-sig')

    response = StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=bingo_participation.csv"}
    )

    return response


@admin_router.get("/download-all-interactions", summary="모든 인터랙션 데이터 다운로드")
async def download_all_interactions(
    db: AsyncSessionDepends,
):
    """
    사용자 간의 모든 인터랙션 기록을 CSV 파일로 다운로드합니다.
    """
    users = await get_all_users(db)
    boards = await get_all_bingo_boards(db)

    user_map = {user.user_id: user for user in users}
    
    # (ReceiverID, SenderID)를 키로 사용하여 인터랙션을 그룹화합니다.
    grouped_interactions = {}
    
    for board in boards:
        receiver_user = user_map.get(board.user_id)
        if not receiver_user:
            continue

        for cell_data in board.board_data.values():
            sender_id = cell_data.get("interaction_id")
            keyword = cell_data.get("value")

            if sender_id and keyword:
                sender_user = user_map.get(sender_id)
                if not sender_user:
                    continue

                group_key = (receiver_user.user_id, sender_user.user_id)
                
                if group_key not in grouped_interactions:
                    grouped_interactions[group_key] = {
                        "ReceiverID": receiver_user.user_id,
                        "SenderID": sender_user.user_id,
                        "ReceiverName": receiver_user.user_name,
                        "SenderName": sender_user.user_name,
                        "Keywords": [],
                        "Timestamp": board.updated_at.strftime('%Y-%m-%d %H:%M:%S') if board.updated_at else None,
                    }
                
                grouped_interactions[group_key]["Keywords"].append(keyword)

    # 그룹화된 데이터를 리스트로 변환하고 키워드를 콤마로 연결합니다.
    interaction_list = list(grouped_interactions.values())
    for item in interaction_list:
        item["Keyword"] = ", ".join(item.pop("Keywords"))

    # 시간순, 이름순으로 정렬합니다.
    if interaction_list:
        interaction_list.sort(key=lambda x: (x.get("Timestamp", ""), x.get("ReceiverName", ""), x.get("SenderName", "")), reverse=True)

    df = pd.DataFrame(interaction_list)
    
    stream = io.StringIO()
    df.to_csv(stream, index=False, encoding='utf-8-sig')
    
    response = StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=all_interactions.csv"}
    )
    
    return response
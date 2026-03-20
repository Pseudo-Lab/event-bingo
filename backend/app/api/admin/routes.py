from fastapi import APIRouter, HTTPException, Depends, status
from core.db import AsyncSessionDepends
from core.dependencies import authenticate_user, get_current_admin, require_super_admin_role
from models.admin import Admin, AdminRole
from .schema import (
    AdminRegisterRequest,
    AdminInfoResponse
)
from .services import set_test_bingo_board, get_all_users, get_all_bingo_boards

import io
import pandas as pd
from starlette.responses import StreamingResponse

admin_router = APIRouter(prefix="/admin", tags=["admin"])

# --- Admin 인증: 로그인은 Supabase Auth에서 처리, 백엔드는 역할 매핑만 ---

@admin_router.post(
    "/auth/register",
    response_model=AdminInfoResponse,
    summary="admin_register",
    description="Supabase 계정의 이메일을 Admin으로 등록합니다. ADMIN 권한이 필요합니다.",
    dependencies=[Depends(require_super_admin_role)]
)
async def register(
    request: AdminRegisterRequest,
    session: AsyncSessionDepends
):
    """Admin 역할 등록 (ADMIN 권한 필요). Supabase 가입은 별도."""
    try:
        admin = await Admin.create(
            session=session,
            email=request.email,
            name=request.name,
            role=request.role
        )

        return AdminInfoResponse(
            id=admin.id,
            email=admin.email,
            name=admin.name,
            role=admin.role.value
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@admin_router.get(
    "/auth/me",
    response_model=AdminInfoResponse,
    summary="get_current_admin_info",
    description="JWT 토큰으로 현재 로그인한 Admin의 정보를 조회합니다."
)
async def get_me(current_admin: Admin = Depends(get_current_admin)):
    """현재 로그인한 Admin 정보"""
    return AdminInfoResponse(
        id=current_admin.id,
        email=current_admin.email,
        name=current_admin.name,
        role=current_admin.role.value
    )


# --- Admin Operations ---

@admin_router.post(
    "/zozo-manual-setting-bingo/{user_id}/{bingo_count}",
    summary="admin_bingo_test_setup",
    dependencies=[Depends(authenticate_user)]
)
async def set_bingo_test_route(
    db: AsyncSessionDepends,
    user_id: int,
    bingo_count: int
):
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


@admin_router.get(
    "/download-attendance-data", 
    summary="download_attendance_data",
    dependencies=[Depends(authenticate_user)]
)
async def download_attendance_data(
    db: AsyncSessionDepends,
):
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
    return StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=attendance.csv"}
    )


@admin_router.get(
    "/download-bingo-participation-data", 
    summary="download_bingo_participation_data",
    dependencies=[Depends(authenticate_user)]
)
async def download_bingo_participation_data(
    db: AsyncSessionDepends,
):
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
    return StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=bingo_participation.csv"}
    )


@admin_router.get(
    "/download-all-interactions", 
    summary="download_all_interactions",
    dependencies=[Depends(authenticate_user)]
)
async def download_all_interactions(
    db: AsyncSessionDepends,
):
    users = await get_all_users(db)
    boards = await get_all_bingo_boards(db)
    user_map = {user.user_id: user for user in users}
    grouped_interactions = {}
    for board in boards:
        receiver_user = user_map.get(board.user_id)
        if not receiver_user: continue
        for cell_data in board.board_data.values():
            sender_id = cell_data.get("interaction_id")
            keyword = cell_data.get("value")
            if sender_id and keyword:
                sender_user = user_map.get(sender_id)
                if not sender_user: continue
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
    interaction_list = list(grouped_interactions.values())
    for item in interaction_list:
        item["Keyword"] = ", ".join(item.pop("Keywords"))
    if interaction_list:
        interaction_list.sort(key=lambda x: (x.get("Timestamp", ""), x.get("ReceiverName", ""), x.get("SenderName", "")), reverse=True)
    df = pd.DataFrame(interaction_list)
    stream = io.StringIO()
    df.to_csv(stream, index=False, encoding='utf-8-sig')
    return StreamingResponse(iter([stream.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=all_interactions.csv"})
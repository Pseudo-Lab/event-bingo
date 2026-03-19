from fastapi import APIRouter, Depends, Path, Query

from .schema import BingoInteractionRequest, BingoInteractionResponse, BingoInteractionListResponse
from .services import CreateBingoInteraction, GetUserLatestInteraction, GetUserAllInteractions


bingo_interaction_router = APIRouter(prefix="/bingo/interactions", tags=["bingo"])


@bingo_interaction_router.post("", response_model=BingoInteractionResponse)
async def create_bingo_interaction(
    data: BingoInteractionRequest,
    bingo_interaction: CreateBingoInteraction = Depends(CreateBingoInteraction),
):
    return await bingo_interaction.execute(**data.model_dump())


@bingo_interaction_router.get("/{user_id}")
async def get_user_latest_interaction(
    user_id: int = Path(..., title="유저 아이디"),
    limit: int = Query(..., title="최대 조회 개수"),
    bingo_interaction: GetUserLatestInteraction = Depends(GetUserLatestInteraction),
):
    return await bingo_interaction.execute(user_id=user_id, limit=limit)


@bingo_interaction_router.get("/{user_id}/all", response_model=BingoInteractionListResponse)
async def get_user_all_interactions(
    user_id: int = Path(..., title="유저 아이디"),
    after_interaction_id: int | None = Query(None, title="마지막으로 확인한 인터랙션 ID", ge=0),
    bingo_interaction: GetUserAllInteractions = Depends(GetUserAllInteractions),
):
    return await bingo_interaction.execute(
        user_id=user_id,
        after_interaction_id=after_interaction_id,
    )

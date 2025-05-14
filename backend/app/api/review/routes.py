from fastapi import APIRouter, Depends, HTTPException
from .schema import ReviewCreate
from .services import CreateReview

review_router = APIRouter(prefix="/reviews", tags=["reviews"])

@review_router.post("/{user_id}")
async def create_review(
    user_id: int,
    review_data: ReviewCreate,
    create_review_service: CreateReview = Depends(CreateReview)
):
    try:
        await create_review_service.execute(user_id=user_id, review_data=review_data)
        return {"message": "리뷰가 저장되었습니다."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

from core.db import AsyncSessionDepends
from models.user import BingoUser
from .schema import ReviewCreate

class CreateReview:
    def __init__(self, session: AsyncSessionDepends):
        self.async_session = session

    async def execute(self, user_id: int, review_data: ReviewCreate) -> None:
        await BingoUser.update_review(
            session=self.async_session,
            user_id=user_id,
            rating=review_data.rating,
            review=review_data.review
        )

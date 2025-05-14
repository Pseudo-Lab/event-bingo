from typing import Optional
from pydantic import BaseModel

from core.base_schema import BaseSchema

class ReviewCreate(BaseModel):
    rating: int
    review: Optional[str] = None

class ReviewResponse(BaseSchema):
    user_id: int
    rating: int
    review: Optional[str] = None
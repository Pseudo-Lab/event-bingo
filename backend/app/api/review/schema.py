from typing import Optional
from pydantic import BaseModel

class ReviewCreate(BaseModel):
    rating: int
    review: Optional[str] = None

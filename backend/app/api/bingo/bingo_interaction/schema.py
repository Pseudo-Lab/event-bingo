from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

from core.base_schema import BaseSchema


class BingoInteractionRequest(BaseModel):
    word_id_list: str = Field(..., title="빙고 인터렉션에 사용될 단어 리스트")
    send_user_id: int = Field(..., title="인터렉션을 보낸 유저 ID")
    receive_user_id: int = Field(..., title="인터렉션을 받는 유저 ID")


class BingoInteractionResponse(BaseSchema):
    interaction_id: Optional[int] = Field(title="인터렉션 ID", default=None)
    word_id_list: Optional[str] = Field(title="단어 ID 리스트", default=None)
    send_user_id: Optional[int] = Field(title="보낸 유저 ID", default=None)
    receive_user_id: Optional[int] = Field(title="받은 유저 ID", default=None)
    updated_words: Optional[list[str]] = Field(title="업데이트된 단어들", default=None)
    bingo_count: Optional[int] = Field(title="업데이트된 빙고 갯수", default=None)
    send_user_name: Optional[str] = Field(title="보낸 유저 이름", default=None)
    receive_user_name: Optional[str] = Field(title="받은 유저 이름", default=None)
    created_at: Optional[datetime] = Field(title="생성일", default=None)


class BingoInteractionListResponse(BaseSchema):
    interactions: list[BingoInteractionResponse]

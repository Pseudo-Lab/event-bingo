from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/integrations", tags=["integrations"])

@router.post("/notion/webhook")
async def notion_webhook(request: Request):
    try:
        print("Webhook endpoint hit!")  # 디버깅 로그 추가
        event = await request.json()
        print("Received Notion event:", event)
        return {"message": "Webhook received", "event": event}
    except Exception as e:
        print(f"Error: {e}")  # 디버깅 로그 추가
        raise HTTPException(status_code=500, detail=str(e))

# 이메일 데이터 스키마 정의
class EmailData(BaseModel):
    subject: str
    date: str

@router.post("/umoh/emails")
async def receive_email(data: EmailData):
    """
    Google Apps Script에서 이메일 데이터를 받는 엔드포인트
    """
    try:
        print(f"Received email: {data}")  # 디버깅 로그
        # 여기서 받은 데이터를 처리하거나 저장하는 로직 추가
        return {"ok": True, "message": "Email received successfully"}
    except Exception as e:
        print(f"Error processing email: {e}")  # 디버깅 로그
        raise HTTPException(status_code=500, detail="Failed to process email")

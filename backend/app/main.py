from fastapi import FastAPI, Depends, status, Response
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi

import os
from contextlib import asynccontextmanager
from core.db import db
from api import api_router
from starlette.middleware.cors import CORSMiddleware
from core.dependencies import authenticate_user


# lifespan 유지
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 서버 시작 전 초기화 단계 작성
    db.initialize()
    await db.create_database()
    yield

# docs_url, openapi_url을 None으로 비활성화
app = FastAPI(
    lifespan=lifespan,
    docs_url=None,
    openapi_url=None,
)

# ✅ 실제 인증된 사용자에게만 문서 제공
@app.get("/docs", include_in_schema=False)
def get_docs(_=Depends(authenticate_user)):
    return get_swagger_ui_html(openapi_url="/openapi.json", title="Bingo API Docs")

@app.get("/openapi.json", include_in_schema=False)
def get_openapi_spec(_=Depends(authenticate_user)):
    return get_openapi(title="Bingo API", version="1.0.0", routes=app.routes)

# 라우터 및 기타 설정
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


@app.get("/")
def hc():
    return "server is running"


@app.post("/api/zozo-manual-reset-db")
async def reset_db(response: Response, include_in_schema: bool = False):
    try:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, proxy-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        await db.reset_database()
        return {
            "status": "success",
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "error_type": type(e).__name__
        }

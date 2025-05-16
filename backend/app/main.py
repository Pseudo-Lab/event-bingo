from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from typing import Annotated

import os
from contextlib import asynccontextmanager
from core.db import db
from api import api_router
from starlette.middleware.cors import CORSMiddleware

# Swagger 인증 정보
SWAGGER_USERNAME = os.environ.get("SWAGGER_USERNAME", "admin")
SWAGGER_PASSWORD = os.environ.get("SWAGGER_PASSWORD", "admin")

# 인증 의존성
security = HTTPBasic()

def authenticate_user(credentials: Annotated[HTTPBasicCredentials, Depends(security)]):
    if credentials.username != SWAGGER_USERNAME or credentials.password != SWAGGER_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect credentials",
            headers={"WWW-Authenticate": "Basic"},
        )

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
def get_docs(credentials: Annotated[HTTPBasicCredentials, Depends(authenticate_user)]):
    return get_swagger_ui_html(openapi_url="/openapi.json", title="Bingo API Docs")

@app.get("/openapi.json", include_in_schema=False)
def get_openapi_spec(credentials: Annotated[HTTPBasicCredentials, Depends(authenticate_user)]):
    return get_openapi(title="Bingo API", version="1.0.0", routes=app.routes)

# 라우터 및 기타 설정
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def hc():
    return "server is running"


@app.get("/reset-db/zozo")
async def reset_db():
    await db.reset_database()

from fastapi import FastAPI
from contextlib import asynccontextmanager
from core.db import db
from api import api_router
from starlette.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 서버 시작 전 초기화 단계 작성
    db.initialize()
    await db.create_database()
    yield
    # Clean up the ML models and release the resources


# Swagger UI와 OpenAPI 경로를 Nginx 설정에 맞게 수정
app = FastAPI(
    lifespan=lifespan,
    docs_url="/docs",          # Swagger UI 경로
    openapi_url="/openapi.json" # OpenAPI 스펙 경로
)

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


# @app.get("/reset-db/zozo")
# async def reset_db():
#     await db.reset_database()

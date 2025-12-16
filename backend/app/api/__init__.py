from fastapi import APIRouter
from api.auth import auth_router
from api.bingo.bingo_boards import bingo_boards_router
from api.bingo.bingo_interaction import bingo_interaction_router
from api.integrations import integration_router
from api.review import review_router
from api.admin import admin_router
from api.admin_auth import admin_auth_router  # Admin 인증 라우터 추가

api_router = APIRouter(prefix="/api")

api_router.include_router(auth_router)
api_router.include_router(bingo_boards_router)
api_router.include_router(bingo_interaction_router)
api_router.include_router(integration_router)
api_router.include_router(review_router)
api_router.include_router(admin_router)
api_router.include_router(admin_auth_router)  # Admin 인증 라우터 등록

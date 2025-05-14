from fastapi import APIRouter

from api.auth import auth_router
from api.bingo.bingo_boards.routes import bingo_boards_router
from api.bingo.bingo_interaction.routes import bingo_interaction_router
from api.integrations.routes import router as integrations_router
from api.review.routes import review_router

api_router = APIRouter(prefix="/api")

routers = [
    auth_router,
    bingo_boards_router,
    bingo_interaction_router,
    integrations_router,
    review_router,
]

for router in routers:
    api_router.include_router(router)

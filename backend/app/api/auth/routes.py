from fastapi import APIRouter, Depends
from api.auth.schema import (
    LoginToken,
    LoginResponse,
    BingoUser,
    LoginType,
    LoginUrl,
    BingoRegisterRequest,
    BingoLoginRequest,
)
from api.auth.services.bingo_login import (
    LoginBingoUser,
    RegisterBingoUser,
)

auth_router = APIRouter(prefix="/auth")


@auth_router.post("/bingo/register", response_model=BingoUser, description="빙고 회원가입 API")
async def bingo_register(
    data: BingoRegisterRequest,
    register_bingo_user: RegisterBingoUser = Depends(RegisterBingoUser),
):
    res = await register_bingo_user.execute(data.username, data.password)
    return res


@auth_router.post("/bingo/login", response_model=BingoUser, description="빙고 로그인 API")
async def bingo_login(
    data: BingoLoginRequest,
    login_bingo_user: LoginBingoUser = Depends(LoginBingoUser),
):
    res = await login_bingo_user.execute(data.login_id, data.password)
    return res

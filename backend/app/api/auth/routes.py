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
    GetBingoUserByName,
    GetBingoUserById,
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


@auth_router.get("/bingo/get-user", response_model=BingoUser, deprecated=True, description="/bingo/users/get-user-by-name을 사용해주세요.")
async def bingo_get_user(username: str, bingo_user: GetBingoUserByName = Depends(GetBingoUserByName)):
    return await bingo_user.execute(username)


@auth_router.get("/bingo/get-user-by-name", response_model=BingoUser, description="유저 조회 API")
async def bingo_get_user(username: str, bingo_user: GetBingoUserByName = Depends(GetBingoUserByName)):
    return await bingo_user.execute(username)


@auth_router.get("/bingo/get-user/{user_id}", response_model=BingoUser, description="빙고용 임시 유저 조회 API")
async def bingo_get_user(user_id: int, bingo_user: GetBingoUserById = Depends(GetBingoUserById)):
    return await bingo_user.execute(user_id)

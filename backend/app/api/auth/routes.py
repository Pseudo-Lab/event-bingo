import re
from fastapi import APIRouter, Depends, Path, Request, HTTPException
from api.auth.schema import LoginToken, LoginResponse, BingoUser, LoginType, LoginUrl
from api.auth.services.bingo_login import LoginUser, GetBingoUserByName, GetBingoUserById, NewLoginUser

auth_router = APIRouter(prefix="/auth")


# @auth_router.post("/bingo/sign-up", response_model=BingoUser, description="빙고용 회원가입 API")
# async def bingo_sign_up(email: str, bingo_user: LoginUser = Depends(LoginUser)):
#     res = await bingo_user.execute(email)
#     return res


@auth_router.post("/bingo/new-sign-up", response_model=BingoUser, description="빙고 회원가입 API")
async def bingo_new_sign_up(email: str, username: str, new_bingo_user: NewLoginUser = Depends(NewLoginUser)):
    # email 형식 확인
    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
        raise HTTPException(status_code=400, detail="이메일 형식이 올바르지 않습니다.")
    username = username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="이름을 입력해주세요.")
    
    res = await new_bingo_user.execute(email, username)
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

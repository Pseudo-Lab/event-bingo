from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse

from core.dependencies import AsyncSessionDepends
from core.security import create_access_token
from models.user import BingoUser
from api.auth.schema import QuickLoginRequest, QuickLoginResponse

# OAuth 설정용 (차후 환경 변수 활용)
from authlib.integrations.starlette_client import OAuth
import os

oauth_router = APIRouter(prefix="/oauth", tags=["auth"])
oauth = OAuth()

# 로컬 테스트용 환경변수 (실제 배포시는 .env에서 로드)
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GITHUB_CLIENT_ID = os.environ.get("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.environ.get("GITHUB_CLIENT_SECRET", "")

if GOOGLE_CLIENT_ID:
    oauth.register(
        name='google',
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
        client_kwargs={
            'scope': 'openid email profile'
        }
    )

if GITHUB_CLIENT_ID:
    oauth.register(
        name='github',
        client_id=GITHUB_CLIENT_ID,
        client_secret=GITHUB_CLIENT_SECRET,
        access_token_url='https://github.com/login/oauth/access_token',
        access_token_params=None,
        authorize_url='https://github.com/login/oauth/authorize',
        authorize_params=None,
        api_base_url='https://api.github.com/',
        client_kwargs={'scope': 'user:email'},
    )

@oauth_router.post("/quick-login", response_model=QuickLoginResponse, summary="quick_login")
async def quick_login(request: QuickLoginRequest, session: AsyncSessionDepends):
    """
    이메일만으로 서비스를 바로 시작할 수 있는 빠른 로그인 엔드포인트입니다.
    - 기존에 등록된 이메일이면 즉시 로그인
    - 등록되지 않은 이메일이면 가입 처리 후 로그인
    """
    email = request.email.lower().strip()
    
    user = await BingoUser.get_user_by_email(session, email)
    is_new_user = False
    
    if not user:
        is_new_user = True
        user = await BingoUser.create_or_get_by_email(
            session=session,
            email=email,
            user_name=request.user_name
        )
    
    access_token = create_access_token(data={"sub": user.user_id, "email": user.user_email})
    
    return QuickLoginResponse(
        ok=True,
        message="성공적으로 로그인되었습니다.",
        access_token=access_token,
        token_type="bearer",
        is_new_user=is_new_user
    )


@oauth_router.get("/{provider}/login", summary="oauth_login")
async def oauth_login(provider: str, request: Request):
    """OAuth 로그인 페이지로 리다이렉트합니다."""
    client = oauth.create_client(provider)
    if not client:
        raise HTTPException(status_code=404, detail=f"Provider {provider} not supported or not configured")
    
    redirect_uri = request.url_for('oauth_callback', provider=provider)
    # HTTPS 포워딩 문제 방지
    if "http://" in str(redirect_uri) and os.environ.get("ENV") != "local":
        redirect_uri = str(redirect_uri).replace("http://", "https://")
        
    return await client.authorize_redirect(request, str(redirect_uri))


@oauth_router.get("/{provider}/callback", response_model=QuickLoginResponse, summary="oauth_callback")
async def oauth_callback(provider: str, request: Request, session: AsyncSessionDepends):
    """OAuth 인증 결과를 받아 JWT 토큰을 발급합니다."""
    client = oauth.create_client(provider)
    if not client:
        raise HTTPException(status_code=404, detail=f"Provider {provider} not supported")
        
    try:
        token = await client.authorize_access_token(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth 인증 실패: {str(e)}")
        
    user_email = None
    user_name = None
    provider_id = None
    
    if provider == 'google':
        user_info = token.get('userinfo')
        if not user_info:
            raise HTTPException(status_code=400, detail="유저 정보를 가져오지 못했습니다.")
        user_email = user_info.get('email')
        user_name = user_info.get('name')
        provider_id = user_info.get('sub')
        
    elif provider == 'github':
        resp = await client.get('user', token=token)
        profile = resp.json()
        
        # Github는 이메일을 비공개로 할 수 있으므로 따로 가져와야 함
        emails_resp = await client.get('user/emails', token=token)
        emails = emails_resp.json()
        primary_email = next((email for email in emails if email.get('primary')), emails[0] if emails else None)
        
        if not primary_email:
            raise HTTPException(status_code=400, detail="Github 계정에 연결된 이메일이 없습니다.")
            
        user_email = primary_email.get('email')
        user_name = profile.get('name') or profile.get('login')
        provider_id = str(profile.get('id'))
        
    if not user_email:
        raise HTTPException(status_code=400, detail="이메일 정보를 가져올 수 없습니다.")

    # DB에 연동/저장/조회 (이메일 기준 병합)
    user_email = user_email.lower().strip()
    user = await BingoUser.get_user_by_email(session, user_email)
    is_new_user = False
    
    if user:
        # 기존 유저면 OAuth 정보 업데이트 (선택 사항)
        if user.auth_provider == 'email_only' or user.provider_id is None:
            user.auth_provider = provider
            user.provider_id = provider_id
            await session.commit()
    else:
        is_new_user = True
        user = await BingoUser.create(
            session=session,
            email=user_email,
            user_name=user_name or user_email.split('@')[0],
            auth_provider=provider,
            provider_id=provider_id
        )

    access_token = create_access_token(data={"sub": user.user_id, "email": user.user_email})
    
    return QuickLoginResponse(
        ok=True,
        message="성공적으로 OAuth 로그인되었습니다.",
        access_token=access_token,
        token_type="bearer",
        is_new_user=is_new_user
    )

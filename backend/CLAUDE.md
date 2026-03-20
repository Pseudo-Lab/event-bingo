# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

Event Bingo — 오프라인 행사에서 참가자 간 네트워킹을 유도하는 실시간 빙고 게임 웹 앱의 **백엔드**. FastAPI + SQLAlchemy 2.0 (async) + MySQL 기반.

## 개발 환경 & 주요 명령어

```bash
# 환경 활성화
conda activate bingo

# 서버 실행
python app/start.py  # http://localhost:8000

# DB 마이그레이션
alembic upgrade head                              # 적용
alembic revision --autogenerate -m "description"  # 새 마이그레이션 생성

# 테스트
pytest app/tests/ -v                  # 전체 테스트
pytest app/tests/test_admin.py -v     # 단일 파일
pytest app/tests/test_admin.py::test_admin_register -v  # 단일 테스트

# 포매터 & 린터
black . --line-length=120
ruff check .

# Docker (전체 스택 — 프로젝트 루트에서)
docker-compose up --build
```

## 아키텍처

### 레이어 구조

```
api/routes.py  →  api/services.py  →  models/*.py (ORM + CRUD 정적 메서드)
     ↑                                      ↑
core/dependencies.py (DI: 인증, 세션)     core/db.py (AsyncSession 싱글톤)
```

- **Routes**: FastAPI 라우터. 비즈니스 로직은 services에 위임
- **Services**: Depends 주입 가능한 클래스 (예: `CreateBingoBoard`)
- **Models**: SQLAlchemy 2.0 모델에 `@classmethod` CRUD 메서드 직접 정의 (`get_by_id`, `create`, `get_all` 등)

### 인증 체계 (이중 JWT)

| 대상 | 생성 | 검증 Dependency | 페이로드 |
|------|------|-----------------|----------|
| Admin | `core/security.py` `create_access_token()` | `get_current_admin()` | `sub=admin_id, admin_role` |
| User | 같은 함수 또는 Supabase 토큰 | `get_current_user()` | Supabase JWT (RS256) → fallback 로컬 JWT (HS256) |

권한 체크: `require_admin_role()` (ADMIN 또는 EVENT_MANAGER), `require_super_admin_role()` (ADMIN만)

### API 라우트 네임스페이스

- `/api/admin/` — Admin JWT 필요 (관리자 제어면)
- `/api/auth/`, `/api/oauth/` — 유저 인증/가입
- `/api/bingo/boards/`, `/api/bingo/interactions/` — 빙고 게임 핵심
- `/api/reviews/` — 이벤트 리뷰
- `/api/integrations/` — 외부 서비스 웹훅 (Notion, Discord)

### DB & 세션 관리

- `core/db.py`의 `Database` 싱글톤이 async engine + scoped session 관리
- `AsyncSessionDepends = Annotated[AsyncSession, Depends(db.get_session)]`로 라우터에 주입
- 환경 변수: `config/.env`에서 `DB_URL` 로드 (mysql+aiomysql)

### 핵심 모델 관계

- **Event**가 Room 역할 겸임 (별도 rooms 테이블 없음)
- Event → Team (1:N, color: BLUE/RED), Event → EventAttendee (1:N)
- EventAttendee는 user_id + event_id + team_id(nullable) 조합
- BingoBoards: `board_data` JSON 컬럼에 빙고판 상태 저장
- BingoInteraction: 키워드 교환 이력

## 코딩 컨벤션

- **비동기 필수**: 모든 DB 작업은 `async/await`. 커밋은 트랜잭션 단위로 한 번만
- **JSON mutation 주의**: SQLAlchemy JSON 컬럼 수정 시 `flag_modified()` 필수 (Bug #81 참조)
- **에러 응답**: `HTTPException` 직접 raise, 한국어 메시지 사용
- **포매터**: black (line-length=120), ruff
- **커밋**: 한국어 OK, conventional prefix (`feat:`, `fix:`, `refactor:`)
- **브랜치**: `feat/<기능명>` 패턴
- **RLS 대체**: DB 레벨 권한 대신 서비스 레이어에서 `current_user`/`current_admin`으로 접근 제어

## 필독 문서

- `PLAN.md` — 백엔드 전체 구현 플랜 (10개 태스크, 의존성 그래프, API/DB 설계). **새 작업 전 반드시 참조**
- `../AGENT.md` — 프로젝트 전체 컨텍스트 (프론트엔드 포함)

## 환경 변수

`config/.env` 또는 `app/.env`에서 로드. 주요 변수:
- `DB_URL` — MySQL 연결 문자열
- `JWT_SECRET_KEY` — JWT 서명 키
- `SWAGGER_USERNAME`, `SWAGGER_PASSWORD` — Swagger 문서 접근 인증
- OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`

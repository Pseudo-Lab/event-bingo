# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

```bash
# 서버 실행
conda activate bingo
cd app
python start.py --log-level INFO  # 0.0.0.0:8000, 4 workers

# 개발 서버 (hot-reload)
conda run -n bingo python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# 테스트
conda run -n bingo python -m pytest tests/ -v

# 마이그레이션
cd app
alembic revision --autogenerate -m "description"
alembic upgrade head
```

## 환경 설정

설정 파일: `app/config/.env` (코드가 읽는 위치)

필수 환경변수:
- `DB_URL` — `mysql+aiomysql://user:pass@host:port/db`
- `SWAGGER_USERNAME` / `SWAGGER_PASSWORD` — Swagger docs 접근용
- `SUPABASE_URL` / `SUPABASE_JWT_SECRET` — Supabase 인증 (선택)

## 아키텍처

**스택**: FastAPI + SQLAlchemy 2.0 (async) + MySQL (aiomysql) + Alembic

### 디렉토리 구조
```
app/
├── main.py              # FastAPI app, lifespan, CORS, docs auth
├── start.py             # uvicorn 엔트리포인트
├── core/
│   ├── db.py            # Database 싱글톤 (async_scoped_session)
│   ├── dependencies.py  # Depends: get_current_user, authenticate_user
│   ├── security.py      # Supabase JWT decode (JWKS + HS256)
│   └── base_schema.py   # Pydantic BaseSchema
├── api/                 # 라우터 + 서비스
│   ├── __init__.py      # api_router 집합 (prefix="/api")
│   ├── admin/           # 관리자 API (JWT 인증)
│   ├── auth/            # 유저 인증 (login_id/password + Supabase)
│   ├── bingo/           # 빙고 게임 로직
│   │   ├── bingo_boards/
│   │   └── bingo_interaction/
│   └── events/          # 이벤트 조회
├── models/              # SQLAlchemy ORM
│   ├── base.py          # DeclarativeBase
│   ├── user.py          # BingoUser
│   ├── admin.py         # Admin
│   ├── event.py         # Event (game_mode, max_per_room)
│   ├── room.py          # Room (event_id FK, is_open)
│   ├── team.py          # Team (room_id FK, color)
│   ├── event_attendee.py
│   └── bingo/           # BingoBoards, BingoInteraction
└── migrations/versions/ # Alembic 마이그레이션
```

### 핵심 패턴

**모델 CRUD**: 모든 모델에 `@classmethod async` CRUD 메서드. `AsyncSession`을 첫 인자로 받음. 에러 시 `ValueError` raise.
```python
admin = await Admin.get_by_id(session, admin_id)  # ValueError if not found
```

**서비스 클래스**: `api/bingo/*/services.py`에서 사용. `BaseBingoBoard` 상속, `execute()` 메서드, `Depends()`로 주입.

**인증 두 가지**:
- Admin: `authenticate_admin_session` (로컬 JWT → Supabase JWT 폴백)
- User: `get_current_user` (Supabase JWT → BingoUser 자동생성)
- 기존 login_id/password 인증도 병행 유지 (dual auth)

**DB 세션**: `db.get_session()`이 auto-commit/rollback 처리. `AsyncSessionDepends` 타입 사용.

### 컨벤션
- Timestamp: `datetime.now(ZoneInfo("Asia/Seoul"))`, `DateTime(timezone=True)`
- Enum: `enum.Enum` + SQLAlchemy `Enum()` 컬럼
- Password: `bcrypt.hashpw` / `bcrypt.checkpw`
- JSON 컬럼: board_data는 `MutableDict.as_mutable(JSON)`, 나머지는 `JSON`
- 응답 스키마: `BaseSchema` 상속 (`ok`, `message` 필드)

## 데이터 모델 (설계 방향)

```
Event (행사: 키워드, 빙고크기, game_mode, max_per_room)
  └── Room (게임 방, 참가자 입장 시 자동 생성)
       ├── Team BLUE ─┐  (팀전 모드일 때만)
       ├── Team RED  ─┤
       ├── EventAttendee (참가자)
       ├── BingoBoards (빙고판, PK: user_id + room_id)
       └── BingoInteraction (교환 기록)
```

- **game_mode**: "individual"(개인전) 또는 "team"(팀전) — Event 레벨 설정
- **키워드**: Event 레벨 공유, 각 참가자 빙고판 배치는 랜덤
- **방 자동 생성**: 정원(max_per_room) 차면 새 방 생성
- **팀 배정**: 팀전 시 인원 적은 팀에 자동 배정

## Task 진행 현황

| Task | Issue | 상태 | 내용 |
|------|-------|------|------|
| Task 2 | #93 | PR #116 완료 | Supabase JWT 인증 추가 (dual auth) |
| Task 3 | #94 | 진행중 | Room 테이블 + 기존 테이블 room_id 확장 |
| Task 4 | #95 | 대기 | 이벤트 입장/퇴장 API |
| Task 5 | #96 | 대기 | 관리자 이벤트/방 운영 API |
| Task 8 | #99 | 대기 | 서버사이드 빙고 판정 (room 스코프) |
| Task 9 | #100 | 대기 | 팀전 로직 + 리더보드 |

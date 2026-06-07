# Admin Member Metadata Handoff

## Task Metadata
- Task ID: 관리자 계정 생성일 KST 정리 및 더미 전화번호 제거

## Scope
- In scope:
  - 관리자 계정 목록 API 응답에서 실제 데이터가 없는 `phone` 필드 제거
  - 관리자 계정 목록 UI의 전화번호 컬럼 제거
  - 관리자 계정 `created_at`/`updated_at` 기본값을 KST wall-clock 기준으로 변경
  - 기존 관리자 계정 timestamp를 UTC wall-clock에서 KST wall-clock으로 보정하는 migration 추가
- Out of scope:
  - 행사 매니저 신청서에 전화번호 입력 추가
  - 개인정보 수집 항목 확대
  - 운영 알림/이메일 내용 변경

## Workspace
- Worktree path: `/home/ubuntu/.openclaw/workspace-df/event-bingo`
- Branch: `fix/admin-member-created-at-phone`
- Base: `main`

## Inputs Used
- Source docs:
  - `AGENTS.md`
- Additional constraints:
  - API 응답과 DB migration을 함께 바꾸므로 PR 대상입니다.
  - root workspace의 untracked `image.png`는 기존 파일로 보고 건드리지 않았습니다.

## Changes Made
- Files changed:
  - `backend/app/api/admin/schema.py`
  - `backend/app/api/admin/console_services.py`
  - `backend/app/models/admin.py`
  - `backend/app/migrations/versions/e4f5a6b7c8d9_normalize_admin_timestamps_to_kst.py`
  - `backend/app/tests/test_admin_console_services.py`
  - `frontend/src/api/admin_api.ts`
  - `frontend/src/modules/Admin/AdminPortal.tsx`
  - `frontend/src/modules/Admin/adminTypes.ts`
  - `frontend/e2e/support/adminApi.ts`
- Behavior changes:
  - 관리자 계정 목록에서 전화번호가 더 이상 표시되지 않습니다.
  - 새 관리자 계정의 생성/수정 시각은 KST wall-clock으로 저장됩니다.
  - migration 적용 시 기존 관리자 계정의 생성/수정 시각에 9시간을 더해 KST 표시와 맞춥니다.

## Validation
- Tests run:
  - `npm run lint`
  - `npm test`
  - `npm run build`
  - `docker exec event-bingo-backend-1 sh -lc 'cd /app && PYTHONPATH=/app/app python -m pytest app/tests/test_admin_console_services.py'`
  - `docker exec event-bingo-backend-1 sh -lc 'cd /app && PYTHONPATH=/app/app alembic heads'`
  - `docker exec event-bingo-backend-1 sh -lc 'cd /app && PYTHONPATH=/app/app alembic current'`
- Results:
  - Frontend lint/test/build passed.
  - Backend admin console service tests passed.
  - Alembic head/current is `e4f5a6b7c8d9`.
- Not run and reason:
  - Full E2E was not run; changed UI is limited to admin member list metadata and covered by type/build checks.

## Risks
- Known risks:
  - 기존 관리자 timestamp가 이미 수동으로 KST 보정된 환경이 있다면 migration이 9시간을 한 번 더 더할 수 있습니다.
  - 현재 코드/런타임 기준으로는 기존 값이 UTC wall-clock으로 저장된 가능성이 높아 보정 migration을 포함했습니다.
- Follow-up needed:
  - 전화번호 수집이 실제로 필요해지면 신청서, API, DB, 개인정보 안내를 별도 PR로 확장해야 합니다.

## Next Owner
- Owner: FE/BE reviewer
- Expected next action: PR 리뷰 후 운영 배포 시 Alembic migration 적용 확인

## Task Metadata
- Task ID: 2026-03-19-polling-optimization

## Scope
- In scope:
  - 빙고 polling 구조를 유지하면서 전체 히스토리 재조회와 사용자 이름 fan-out 호출을 줄이는 개선
  - 인터랙션 전체 조회 API에 delta cursor(`after_interaction_id`) 추가
  - 인터랙션 응답에 송신/수신 사용자 이름 포함
  - 프론트엔드에서 단일 polling 루프와 로컬 인터랙션 머지 적용
  - 키워드 전송을 서버 한 API/한 트랜잭션으로 처리하도록 원자화
- Out of scope:
  - WebSocket/SSE/Supabase Realtime 전환
  - 새로운 E2E 테스트 도입

## Inputs Used
- Source docs:
  - `/Users/skkim/Documents/pseudolab/DevFactory/event-bingo/AGENTS.md`
- Additional constraints:
  - polling 방식 유지
  - 기존 사용자 흐름은 유지하되 요청 수와 재조회 범위 축소

## Changes Made
- Files changed:
  - `backend/app/api/bingo/bingo_interaction/schema.py`
  - `backend/app/api/bingo/bingo_interaction/routes.py`
  - `backend/app/api/bingo/bingo_interaction/services.py`
  - `backend/app/models/bingo/bingo_interaction.py`
  - `backend/app/tests/test_bingo_interaction_services.py`
  - `frontend/src/api/bingo_api.ts`
  - `frontend/src/modules/Bingo/BingoGame.tsx`
- Behavior changes:
  - `/api/bingo/interactions/{user_id}/all`에서 `after_interaction_id` 이후의 변경분만 조회 가능
  - 인터랙션 응답에 `send_user_name`, `receive_user_name` 포함
  - 프론트는 초기 1회 전체 로드 후 5초 polling에서 delta 인터랙션만 병합
  - 히스토리 패널 생성 시 추가 `getUserName` fan-out 제거
  - 키워드 전송 시 프론트는 `/api/bingo/interactions` 한 번만 호출하고, 서버가 보드 업데이트와 인터랙션 생성을 함께 처리
  - 키워드 전송 성공 시 전체 히스토리 재조회 대신 생성된 인터랙션과 `updated_words`를 로컬 상태에 즉시 반영

## Validation
- Tests run:
  - `npm run lint`
  - `npm run build`
  - `python3 -m py_compile app/api/bingo/bingo_interaction/schema.py app/api/bingo/bingo_interaction/routes.py app/api/bingo/bingo_interaction/services.py app/models/bingo/bingo_interaction.py app/tests/test_bingo_interaction_services.py`
- Results:
  - 프론트 lint 통과
  - 프론트 프로덕션 빌드 통과
  - 변경한 백엔드 파이썬 파일 문법 검증 통과
- Not run and reason:
  - `pytest`: 로컬 환경에 `pytest`가 설치되어 있지 않았고 `poetry` 실행 환경도 깨져 있어 실제 테스트 실행은 확인하지 못함

## Risks
- Known risks:
  - delta cursor는 `interaction_id` 증가를 기준으로 동작하므로, 비정상적인 수동 데이터 수정 시 예상과 다를 수 있음
- Follow-up needed:
  - 백그라운드 탭에서 polling interval을 늘리거나 일시 중지하는 최적화 검토
  - backend test runner 환경 복구 후 추가 테스트 실행

## Next Owner
- Owner: frontend / backend-api
- Expected next action:
  - 실제 행사 시나리오로 전송/수신/중복 전송/다중 수신 polling 동작과 원자적 전송 흐름을 QA

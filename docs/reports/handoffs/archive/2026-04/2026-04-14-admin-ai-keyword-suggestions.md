> Status: deferred on 2026-04-14. The implementation was reverted from code/config and this note is being kept as a future reference only.

## Task Metadata
- Task ID: 2026-04-14-admin-ai-keyword-suggestions

## Scope
- In scope:
  - Admin event modal에 CPU-only Ollama 기반 AI 키워드 추천 추가
  - 행사 설명/참가자 구성/톤/포함·제외 키워드 입력 UI 추가
  - Backend admin AI 추천 API와 rule-based fallback 추가
  - 관련 테스트와 env example 업데이트
- Out of scope:
  - Ollama 실제 배포/프로세스 관리
  - k3s/ArgoCD GitOps manifest 변경
  - 외부 유료 LLM 연동

## Inputs Used
- Source docs:
  - `docs/reference/agent-collaboration.md`
- Additional constraints:
  - CPU-only 기준
  - 기본 추천은 유지하고, AI 추천 실패 시 fallback 필요
  - 모델 기본값은 `qwen3:4b`

## Changes Made
- Files changed:
  - `backend/app/api/admin/schema.py`
  - `backend/app/api/admin/routes.py`
  - `backend/app/api/admin/keyword_ai.py`
  - `backend/app/tests/test_admin_routes.py`
  - `backend/app/tests/test_admin_keyword_ai.py`
  - `backend/app/config/.env.example`
  - `frontend/src/api/admin_api.ts`
  - `frontend/src/modules/Admin/AdminPortal.tsx`
  - `frontend/src/modules/Admin/adminKeywordUtils.ts`
  - `frontend/src/modules/Admin/adminKeywordUtils.test.ts`
- Behavior changes:
  - Admin event modal에서 기존 rule-based 추천과 별도로 `AI 추천받기` 가능
  - AI 추천 입력값:
    - 행사 설명
    - 참가자 구성
    - 추천 톤
    - 꼭 넣고 싶은 키워드
    - 피하고 싶은 키워드
  - Backend는 `/api/admin/events/keyword-suggestions/ai`에서 Ollama `/api/chat` 호출
  - Ollama 응답이 비정상적이거나 연결 실패하면 backend rule-based 추천으로 자동 대체
  - 기본 env 값:
    - `ADMIN_AI_OLLAMA_URL=http://localhost:11434`
    - `ADMIN_AI_OLLAMA_MODEL=qwen3:4b`

## Validation
- Tests run:
  - `backend/venv/bin/python -m py_compile backend/app/api/admin/schema.py backend/app/api/admin/routes.py backend/app/api/admin/keyword_ai.py backend/app/tests/test_admin_routes.py backend/app/tests/test_admin_keyword_ai.py`
  - `PYTHONPATH=backend/app backend/venv/bin/python -m pytest backend/app/tests/test_admin_routes.py backend/app/tests/test_admin_keyword_ai.py backend/app/tests/test_admin_console_services.py`
  - `npm run test -- src/modules/Admin/adminKeywordUtils.test.ts`
  - `npm run build`
- Results:
  - All passed
- Not run and reason:
  - Ollama 실서버 호출 E2E는 로컬 런타임 의존이라 미실행

## Risks
- Known risks:
  - Ollama가 내려가 있거나 모델이 pull되지 않으면 AI 추천은 fallback으로만 동작
  - CPU-only에서 첫 응답 latency가 길 수 있음
  - 현재 fallback reason을 UI에 노출하므로 운영 환경에선 메시지 톤을 더 다듬을 수 있음
- Follow-up needed:
  - 실제 운영 서버에서 `qwen3:4b` preload 여부 결정
  - 필요 시 AI 추천 결과 품질 기준과 금칙어 정책 추가

## Next Owner
- Owner: backend-api / frontend
- Expected next action:
  - 운영 환경에 Ollama를 붙일지 결정
  - 실제 행사 데이터 기준으로 prompt/fallback 품질 조정

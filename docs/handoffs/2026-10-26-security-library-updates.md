# 보안 라이브러리 갱신 검증 및 배포 인수인계

## Task Metadata
- Task ID: security-library-updates-20261026
- 상태: 로컬 구현·회귀 완료, 운영 배포 전 검토 필요.

## Scope
- In scope: certifi/cryptography 갱신, 호환되는 FastAPI/Starlette 동반 갱신, JWT 및 HTTP 회귀, 일회용 DB 검증.
- Out of scope: 운영 DB 쓰기, 운영 canary, migration 수정, Ops 설정 변경, 운영 배포.

## Workspace
- Worktree path: /home/ubuntu/.openclaw/workspace-bingo-security-20261026
- Branch: fix/security-library-updates-20261026
- Base: 1c9bc119e00185b00b7b0d49b0a701e24baf5008
- 루트 작업 공간의 기존 사용자 변경 및 운영 runtime mount는 보존.

## Inputs Used
- Ops 전달 증거: /home/ubuntu/code/DevFactory-Ops/.agent/security-hardening-20261026/bingo-library-review.txt 및 library-review-summary.txt.
- 앱 원격 main과 로컬 base 모두 1c9bc11, Ops main af1d5e8a622529434501260e2eb9eed35ceef495의 production 이미지 태그도 sha-1c9bc11임을 대조.
- https://github.com/certifi/python-certifi/security/advisories/GHSA-6q48-6c7w-9gw2 (공지는 2026.10.18을 수정 버전으로 표시; 배포 후보는 실제 배포된 PyPI 릴리스 2026.10.19 사용).
- https://github.com/pyca/cryptography/security/advisories/GHSA-g6cj-pr64-35w5
- https://github.com/Kludex/starlette/security/advisories/GHSA-82w8-qh3p-5jfq
- https://fastapi.tiangolo.com/release-notes/#01330 및 PyPI 각 후보 버전 메타데이터.
- FastAPI 저장소 공개 security-advisories와 PyPI 후보 메타데이터 조회에서 후보에 해당하는 알려진 advisory를 찾지 못함. 전체 취약점 부재 보장은 아님.

## Changes Made
- backend/requirements.txt: certifi==2026.10.19 직접 고정, cryptography 46.0.7 → 50.0.0, fastapi 0.109.1 → 0.133.0, starlette==1.3.1 직접 고정.
- FastAPI 0.133.0은 Starlette 1.x 지원 조합의 최소 후보로 선택하여 추가 기능을 도입하지 않음. pip resolver와 pip check 통과.
- backend/app/tests/test_security.py: RS256/ES256 만료, payload/서명 변조, 공개키를 HMAC secret으로 사용하는 알고리즘 혼동 거부; JWKS 성공/HTTP 오류/TLS 오류 회귀 추가.
- backend/app/tests/test_http_regression.py: 실제 ASGI routing/middleware를 거치는 JSON, 관리자 인증·역할, 참가자 bearer 인증, CORS, metrics, CSV 다운로드, SEO 성공·없음·upstream 실패 회귀 추가. 외부 서비스와 DB는 해당 단위 테스트에서 대체.
- 애플리케이션 인증 구현·DB 스키마·migration·프런트엔드 파일은 변경하지 않음.

### API 계약 변화
- FastAPI 기본 HTTPBearer 변경으로 `/api/play/*`의 Authorization 누락/잘못된 인증 방식은 기존 403에서 401 + `WWW-Authenticate: Bearer`로 바뀜. 로컬 기준 서버와 후보 서버에서 직접 확인하고 새 회귀에 명시.
- 잘못된 bearer 토큰은 기존과 동일하게 401. 관리자 인증은 기존 auto_error=False 경로를 사용하므로 누락/실패 401, 역할 부족 403 유지.
- 프런트엔드 소스의 상태 코드 분기와 기존 전체 UI 회귀를 확인했으나 외부 API 소비자의 403 의존 여부는 배포 전 확인 필요.

## Validation
- Python 3.11 Docker image build 성공 (`docker build --pull`), pip check 성공.
- `ENV=test DB_URL=<일회용 로컬 DB> PYTHONPATH=app pytest -q --run-db-integration app/tests`: 173 passed, 기존 Pydantic Config deprecation warning 1개. issue #81 DB 통합 회귀 포함.
- 알고리즘 혼동 공격을 공개키 HMAC 서명으로 보강한 최종 수정 후 `pytest -q app/tests/test_security.py`: 16 passed.
- `npm test`: 23 files / 99 passed.
- `CI=1 npm run e2e -- --workers=2`: 전체 7개 spec / 19 passed, skip 없음. 모바일 390×844와 데스크톱 시나리오 포함. 기존 E2E는 API mock 기반이므로 운영 backend와 연결한 브라우저 검증으로 표현하지 않음.
- 로컬 frontend 설정의 Supabase URL만 추출하여 새 이미지의 기본 HTTPX TLS/JWKS 호출 성공 (키 1개). `/auth/v1/user`도 TLS 성공, 자격증명 없는 요청에 401. 실제 유효 관리자 세션을 이용한 운영 인증은 미실행; 성공 fallback은 단위/ASGI 테스트에서 검증.
- 기본 HTTPX로 self-signed.badssl.com 접속 시 CERTIFICATE_VERIFY_FAILED 확인. 인증서 검증 우회 없음.
- 새 이미지 Python ssl: OpenSSL 3.5.7 (9 Jun 2026), cryptography OpenSSL: 4.0.1 (9 Jun 2026). 서로 별도로 확인했으며 OS 전체 보안 감사를 의미하지 않음.
- PostgreSQL 16을 tmpfs로 생성, 외부 포트 publish 없음. 테스트 runner의 네트워크 namespace 내 127.0.0.1 DB만 사용. 운영 secret/env 파일을 복사하거나 주입하지 않음.
- 일회용 DB에서 startup seed, PRIVACY_REDACTION_RUN_ON_STARTUP=true 경로, 정상 shutdown, 재시작 후 health 200 확인.
- 같은 호스트/Python base에서 이전 라이브러리 조합과 후보를 각각 100회 순차 health 요청으로 비교: 모두 오류 0, metrics 200. 기준 p50 1.65ms / p95 2.34ms, 후보 p50 1.59ms / p95 2.37ms. 단일 로컬 표본으로 운영 부하/지연 보장 아님.
- alembic 단일 head f3a4b5c6d7e8 확인. 모델로 생성한 일회용 DB를 head로 stamp한 뒤 upgrade head no-op 성공. 이것은 전체 migration 재생 성공을 뜻하지 않음.
- 원시 로그: /tmp/bingo-security-{build,final-tests,frontend-tests,e2e,migrations,baseline-migrations,installed}-20261026.* (로컬 임시 증거, 저장소에 포함하지 않음).

### 확인된 기존 migration 문제
- 빈 일회용 DB에서 `alembic upgrade head`는 events.expected_attendee_count DuplicateColumnError로 실패.
- 이전 certifi/cryptography/FastAPI/Starlette 조합에서도 별도 빈 DB로 같은 실패 재현. 초기 migration에 이미 있는 컬럼을 후속 d2f4a8c9b1e3 migration이 다시 추가함.
- 이번 보안 패치에서 기존 migration을 고치거나 운영 DB의 revision을 추정하지 않음. 운영 initContainer는 upgrade head를 실행하므로 배포 전에 실제 revision과 적용 경로를 확인해야 함. 현재 head라면 no-op 경로, 이전 revision이라면 해당 경로를 별도로 일회용 DB에서 재현해야 함.

## Risks
- 운영 배포 전후 응답/지연/오류, readiness, Pod restart, 내부 호출 및 monitoring scrape는 미검증. 운영 DB canary 금지 유지.
- Ops 전달 backend digest sha256:06504d5284245c2418c68faa2338e91b8265fa0870869ed30787bdfa3c84e28d는 과거 관측값. 배포 직전 live backend/frontend imageID와 GitOps revision을 재확보하고 되돌릴 수 있는 digest인지 확인할 것.
- base image 및 전이 의존성은 기존처럼 완전 고정되지 않음. CI/배포 산출물에서 설치 버전과 Python ssl/cryptography OpenSSL을 다시 확인할 것.
- 운영 관리자 인증 성공 및 외부 API 소비자의 403 의존 확인은 남아 있음.
- POST /api/zozo-manual-reset-db는 운영 DB 무인증 삭제 취약점으로 분류하지 않음. ENV=test/로컬 host/test DB명 guard가 삭제 전에 작동하며 이번 작업에서도 해당 경로 호출 없음.
- Ops PR #25의 frontend token mount 해제, RuntimeDefault seccomp, allowPrivilegeEscalation:false, preStop 10초 및 동일 namespace/ingress-nginx/monitoring ingress 허용 유지. 이번 패치에는 Ops diff 없음, egress 변경 없음.

## Next Owner
- Backend/QA: 후보 PR 및 인증 응답 변화 검토, 운영 DB revision에 대응하는 migration 경로의 일회용 DB 검증. 초기 migration 중복 문제는 별도 수정 대상으로 관리.
- Ops: 승인된 이미지의 Python SSL/설치 버전과 rollback digest 확인, 기존 PR #25 설정 유지, baseline 대비 readiness/오류/지연/내부 호출/모니터링 확인 후 배포 판단.
- 이번 작업에서는 merge/main push/이미지 publish/운영 배포를 실행하지 않음.

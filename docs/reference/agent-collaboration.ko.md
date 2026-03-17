# 에이전트 협업 프로토콜 (한국어)

## 목적
Codex, Claude, Gemini 등 서로 다른 에이전트를 사용해도 동일한 목표를 안정적으로 달성하도록 한다.

## 기준 문서 우선순위
1. `docs/reference/project-requirements.md`
2. `docs/reference/service-user-flow.md`
3. `docs/reference/design-guide.md` (존재 시)
4. 본 문서 `docs/reference/agent-collaboration.md`

## 지원 에이전트
- Codex
- Claude
- Gemini

## 핵심 규칙
- 동일한 기준 문서에서 동일한 결과를 내야 한다.
- 모델별 숨은 메모리에 의존하지 않는다.
- 가정 사항은 핸드오프 노트에 반드시 명시한다.
- 구현은 재현 가능하고 테스트 가능해야 한다.

## 배포 레포지토리 경계
- 이 저장소는 애플리케이션 저장소다.
- k3s/ArgoCD GitOps 매니페스트는 `https://github.com/Pseudo-Lab/DevFactory-Ops`에서 관리한다.
- 배포/런타임 토폴로지 변경이 필요하면 GitOps 저장소 연계 핸드오프를 함께 남긴다.

## 도메인 소유 및 머지 정책
- BE 도메인 소유 범위: `backend/**`
- FE 도메인 소유 범위: `frontend/**`
- Infra(lead) 도메인 소유 범위: 이 저장소의 `.github/workflows/**`, `docker-compose.yaml`, `k8s/**`와 `Pseudo-Lab/DevFactory-Ops`의 배포/운영 매니페스트
- 도메인 소유자는 단일 도메인, 비영향 변경에 한해 PR 없이 `main` 직접 푸시할 수 있다.

## 영향 트리거 (PR 필수)
- 여러 도메인 파일을 동시에 변경한다.
- API 계약, 인증 동작, DB 스키마, 마이그레이션이 다른 도메인에 영향을 준다.
- `docs/*.md` 기준 문서를 변경한다.
- CI/CD, 배포, 보안, ingress, secrets, 런타임 토폴로지 변경이 포함된다.
- `Pseudo-Lab/DevFactory-Ops` 연계 변경이 필요한 경우가 포함된다.
- Product Owner 또는 해당 도메인 소유자가 PR 리뷰를 요청한다.

## 작업 계약 필수 항목
모든 작업 핸드오프에는 아래 항목이 있어야 한다.
- Task ID
- Scope
- Inputs used
- Outputs created or changed
- Risks
- Next owner

템플릿: `docs/templates/agent-handoff.md`

## 브랜치/커밋 규칙
- direct push 경로: 단일 도메인, 비영향 작업은 `main`에 직접 커밋한다.
- PR 경로 브랜치: `feature/<task-id>-<short-slug>` 또는 `fix/<task-id>-<short-slug>` 또는 `codex/<task-id>-<short-slug>`
- 커밋 제목: `<type>(<scope>): <summary>`
- 커밋 본문 또는 PR 설명에 아래 메타데이터 포함
- Agent: codex | claude | gemini
- Model: 가능한 경우 정확한 모델명/버전
- Date: YYYY-MM-DD

## PR 협업 체크리스트
- 기준 문서 참조 여부
- 영향 트리거 체크 및 사유 명시 여부
- 영어 가이드 변경 시 한국어 미러 동기화 여부
- 테스트 근거 첨부 여부
- 핸드오프 템플릿 첨부 여부

## 충돌 해결
- 에이전트별 결과가 다르면 문서 우선순위 기준으로 비교한다.
- 제품 의도 충돌은 Product Owner가 결정한다.
- 기술적 충돌은 해당 도메인 소유자가 결정한다.

## 언어 및 동기화 규칙
- 구현 기준은 영어 가이드 문서다.
- 한국어 미러는 같은 변경에서 반드시 동기화한다.
- 본 문서 동기화 페어:
- `docs/reference/agent-collaboration.md` <-> `docs/reference/agent-collaboration.ko.md`






# 이벤트 빙고 제품 요구사항

## 제품 목표
- 행사 주최자가 최소한의 설정으로 빙고 이벤트를 생성하고 운영할 수 있어야 한다.
- 행사별로 빙고판 크기, 필요 빙고 개수, 키워드 개수를 설정할 수 있어야 한다.
- 주최자가 과거 행사와 결과를 조회할 수 있어야 한다.
- 행사별 리포트를 제공해야 한다.
- 참가자 수
- 누가 누구를 만났는지에 대한 상호작용 그래프
- 총 빙고 교환 횟수
- 가장 많이 선택된 키워드
- DB와 로그인 관리는 Supabase를 사용한다.

## 개발 우선순위 규칙
- 모든 사용자 흐름은 모바일/웹을 모두 지원해야 한다.
1. 서비스 페이지 흐름을 먼저 개발한다.
2. 이후 관리자/리포트 기능을 개발한다.

## 서비스 흐름 기준 문서
- `docs/reference/service-user-flow.md`

## 디자인 가이드 기준 문서
- `docs/reference/design-guide.md`
- 해당 파일이 존재하면 frontend는 반드시 준수한다.

## 프론트엔드 구현 기준
- 프론트엔드 애플리케이션 셸은 `React + Vite + TypeScript`를 유지한다.
- 신규 화면과 리팩터링 화면의 기본 UI 구현 스택은 Tailwind CSS와 `shadcn/ui`를 사용한다.
- 서버 상태 동기화는 `TanStack Query`, 로컬 게임/화면 상태는 `Zustand` 사용을 우선한다.
- 게임 피드백과 화면 전환 효과는 명확성을 높일 때에만 `Motion`을 사용한다.
- 빙고 보드 레이아웃과 완성 라인 렌더링은 `CSS Grid`와 `SVG` 오버레이 방식을 우선한다.
- 화면을 크게 리팩터링할 때는 문서화된 기술 제약이 없는 한 기존 `MUI`, `emotion` UI 레이어 제거를 우선한다.
- 기존 프론트엔드 화면이나 컴포넌트를 수정할 때는, 문서화된 기술 제약이 없는 한 수정 범위의 UI를 Tailwind CSS와 `shadcn/ui` 기준으로 함께 마이그레이션한다.
- 신규 화면, 신규 컴포넌트, 새로 수정하는 영역에 기존 `MUI`, `emotion` 사용 범위를 확대하지 않는다.

## 언어 및 동기화 규칙
- 구현 기준은 영어 가이드(`*.md`)를 우선 사용한다.
- 한국어 문서(`*.ko.md`)는 협업용 미러이며, 영어 가이드 변경 시 반드시 함께 갱신한다.

## 백엔드 우선순위

### P0
- Admin JWT 인증 API (완료)
- 익명 로그인 세션 토큰
- OAuth2 로그인 (Google, GitHub)
- 익명 계정 -> OAuth 계정 연동
- User JWT 의존성 (`get_current_user`)
- event/event_attendee 스키마 확장
- invite code 기반 방 생성
- 방 입장 유효성 검증 및 차단
- 방 퇴장 및 상태 전이
- 서비스 레이어 접근 제어
- 행사별 첫 로그인 시 사용자 랜덤 보드 생성 및 고정

### P1
- 서버 사이드 빙고 판정
- 원자적 키워드 교환 API 및 히스토리
- 운영 API (강제 퇴장, 결과 export)
- 팀 배정 및 팀 리더보드 API
- WebSocket 인프라 및 브로드캐스트
- Issue #81 유형 디싱크 회귀 수정

### P2
- keyword_sets 테이블/API
- event_co_hosts 모델
- 온라인 presence 트래킹

## 프론트엔드 우선순위

### P0
- Supabase 클라이언트 설정
- 대기실 동기화 UI
- 3x3/5x5 가변 빙고 그리드
- 기존 빙고 디자인을 서비스 페이지에 우선 적용
- 로그인 -> 키워드 선택 -> 게임 화면 기본 흐름

### P1
- 실시간 로비 목록/필터
- 키워드 선택/상태 시각화
- 글로벌 상태관리 및 실시간 구독
- 팀 패널 진행상태 렌더링

### P2
- 빙고 달성 효과/우승 팝업

## 인프라/데브옵스 우선순위
- k3s/ArgoCD 매니페스트용 GitOps 저장소: `https://github.com/Pseudo-Lab/DevFactory-Ops`

### P0
- Docker Compose -> k3s 이관
- `Pseudo-Lab/DevFactory-Ops`에서 ArgoCD GitOps 배포 구성
- Supabase Key Sealed Secrets 처리
- Nginx ingress + cert-manager SSL
- GitHub Actions 빌드/GHCR 푸시 자동화

### P1
- 기존 Postgres -> Supabase 데이터 이관
- VictoriaMetrics + Gatus 가용성 체크


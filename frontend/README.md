# Frontend Guide

## 설정 파일 구조

현재 프론트 설정은 JSON 대신 타입 있는 TS 모듈로 정리되어 있습니다.

```text
frontend
└─ src
   └─ config
      ├─ eventConfig.ts
      ├─ bingoConfig.ts
      └─ bingoKeywords.ts
```

### 행사 정보 수정

파일: `src/config/eventConfig.ts`

- `title`: 로그인 화면 행사 카테고리/제목
- `subTitle`: 행사명
- `date`: 행사 날짜
- `place`: 행사 장소
- `host`: 주최자명

### 빙고 동작 설정

파일: `src/config/bingoConfig.ts`

- `unlockTime`: 이 시간 전까지는 카운트다운 화면이 보입니다.
- `exchangeKeywordCount`: 참가자가 처음 고르는 관심사 개수
- `bingoMissionCount`: 성공으로 보는 빙고 줄 수
- `boardSize`, `boardCellCount`: 보드 크기 관련 내부 설정

### 빙고 키워드 수정

파일: `src/config/bingoKeywords.ts`

- `bingoKeywords` 배열을 원하는 키워드로 바꾸면 됩니다.
- 중복/빈 값은 `bingoConfig.ts`에서 정규화됩니다.

### 개인정보 동의 문구 수정

수정 위치: 어드민 페이지 `이용약관 및 개인정보` 탭

- 저장된 문안은 백엔드 DB를 단일 소스로 사용합니다.
- `{host}`와 `{eventTeam}`는 실제 행사 팀명으로 치환됩니다.
- Event Manager는 읽기 전용이고, Admin만 수정할 수 있습니다.

## 개발 명령어

`frontend` 디렉터리에서 실행합니다.

```bash
npm install
npm run dev
npm run lint
npm run build
npm run test
npm run e2e
```

## 테스트 종류

### 유닛 테스트

- 러너: Vitest
- 위치: `src/**/*.test.ts`
- 현재 예시: `src/modules/Bingo/bingoGameUtils.test.ts`

실행:

```bash
npm run test
```

현재는 순수 로직 위주로 테스트합니다.

- interaction 배치 묶음
- 교환 이력 집계
- 빙고 완료 줄 계산

## E2E 처음 실행하는 방법

E2E는 Playwright를 사용합니다. 처음 한 번은 브라우저 설치가 필요합니다.

### 1. 의존성 설치

```bash
npm install
```

### 2. Playwright 브라우저 설치

처음 한 번만 실행하면 됩니다.

```bash
npx playwright install chromium
```

### 3. E2E 실행

```bash
npm run e2e
```

실행하면 Playwright가 `playwright.config.ts`를 읽고, 내부적으로 Vite 개발 서버를 띄운 뒤 테스트를 수행합니다.

### 4. 현재 들어있는 E2E

현재 E2E는 모두 백엔드 없이 실행됩니다. 필요한 API 응답은 각 스펙에서 `page.route(...)`로 mock 합니다.

- `e2e/home.smoke.spec.ts`
  홈 화면 렌더 + 동의서 모달 열기
- `e2e/auth-and-setup.spec.ts`
  회원가입 + 로그인 코드 모달 + 관심사 3개 선택 + 빙고 시작
- `e2e/exchange.spec.ts`
  기존 세션으로 `/bingo` 진입 + 키워드 전송 성공
  중복 전송 사전 차단
  서버 실패 후 재시도 성공

공통 mock 유틸은 `e2e/support/bingoApi.ts`에 있습니다.

## E2E 파일 보는 법

### 설정 파일

파일: `playwright.config.ts`

- `testDir`: E2E 스펙 폴더
- `baseURL`: 테스트 대상 주소
- `webServer`: 테스트 전에 자동으로 띄울 Vite 서버

### 테스트 파일

파일: `e2e/*.spec.ts`

예시 구조:

```ts
import { expect, test } from "@playwright/test";

test("페이지가 열린다", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Bingo Networking" })).toBeVisible();
});
```

## E2E를 추가할 때 권장하는 순서

1. 백엔드 없이 검증 가능한 화면 스모크부터 추가합니다.
2. 그 다음 로그인/설정처럼 입력 폼 중심 흐름을 추가합니다.
3. 그 다음 route mock 기반으로 교환 흐름을 붙입니다.
4. 마지막에 정말 필요할 때만 실제 백엔드 연동 E2E를 별도로 붙입니다.

처음부터 복잡한 빙고 교환 전체를 넣으면 실패 원인을 찾기 어렵습니다.

## 자주 막히는 경우

### `Executable doesn't exist`

브라우저가 아직 설치되지 않은 상태입니다.

```bash
npx playwright install chromium
```

### 포트가 이미 사용 중이거나 서버가 안 뜸

- `4173` 포트를 다른 프로세스가 쓰고 있는지 확인합니다.
- 필요하면 `playwright.config.ts`의 `port`를 바꿉니다.

### API 관련 E2E를 추가했는데 실패함

현재 기본 E2E는 route mock 기반입니다.
새 스펙에서 API를 직접 호출하게 작성했다면:

- 같은 스펙 안에서 `page.route(...)` mock을 추가하거나
- `e2e/support/bingoApi.ts`에 공통 mock/helper를 먼저 추가하거나
- 정말 통합 테스트가 필요할 때만 백엔드 서버를 같이 띄우세요.

## 다음에 확장하면 좋은 E2E

- 최근 로그인 계정 자동 채움
- 로그인 실패 메시지
- 존재하지 않는 상대 ID 처리
- 교환 후 폴링으로 보드 반영되는 흐름

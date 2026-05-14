# 로컬 테스트 데이터베이스 가이드

## 목적
자동화 integration 테스트에는 폐기 가능한 로컬 데이터베이스를 사용합니다. 운영 Supabase 데이터베이스에는 파괴적인 자동화 테스트를 실행하지 않습니다.

## 환경 경계
- 운영 배포는 `Pseudo-Lab/DevFactory-Ops`의 k8s와 ArgoCD로 관리합니다. Docker Compose는 운영 배포 기준이 아닙니다.
- `docker-compose.dev.yaml`은 사람이 로컬 개발과 화면 확인에 사용하는 환경입니다.
- `docker-compose.test.yaml`은 스키마 초기화와 데이터 삭제가 가능한 자동화 테스트 전용 환경입니다.
- 운영 Supabase 데이터베이스는 `ENV=test`, `TEST_DB_URL`, DB reset fixture와 함께 사용하면 안 됩니다.

## 테스트 데이터베이스
로컬 테스트 데이터베이스를 시작합니다.

```bash
docker compose -f docker-compose.test.yaml up -d postgres-test
```

호스트 머신에서는 이 URL을 사용합니다.

```bash
export ENV=test
export TEST_DB_URL=postgresql+asyncpg://event_bingo_test:event_bingo_test@127.0.0.1:55432/event_bingo_test
```

DB 기반 backend 테스트를 실행합니다.

```bash
cd backend
PYTHONPATH=app /tmp/event-bingo-backend-venv/bin/pytest --run-db-integration app/tests/test_bingo_interaction_db_integration.py
```

폐기 가능한 데이터베이스를 정리합니다.

```bash
docker compose -f docker-compose.test.yaml down -v
```

## 안전 규칙
- DB integration fixture는 반드시 `ENV=test`를 요구해야 합니다.
- DB integration fixture는 `localhost`, `127.0.0.1`, `::1`, `postgres-test`의 `event_bingo_test` 데이터베이스만 reset할 수 있어야 합니다.
- 테스트 데이터는 개발/운영 데이터와 분리합니다.
- 파괴적인 setup이 필요한 테스트는 테스트 데이터베이스 경로에만 추가합니다.

## 현재 소규모 운영 서비스 테스트 범위
- 빙고 서비스: 모바일 viewport 필수
- 관리자 페이지: 데스크톱 viewport 필수
- 홈페이지: 모바일과 데스크톱 viewport 필수
- 오프라인 행사 운영에서는 Realtime이 목표입니다. 다만 명시적으로 문서화하면 polling 또는 refresh fallback을 허용할 수 있습니다.

## Issue 81 회귀 기준
키워드 교환은 운영자가 누가 누구와 만났는지 알아야 하므로 항상 interaction history를 보존해야 합니다.

receiver 보드 셀을 갱신할 수 있는 경우 같은 교환에서 다음 두 가지가 함께 저장되어야 합니다.
- `bingo_interaction` row
- receiver 보드의 status와 interaction marker

receiver 보드에서 갱신할 수 있는 셀이 없는 경우에도 교환은 성공이며, 보드 셀 변경 없이 history를 보존해야 합니다.

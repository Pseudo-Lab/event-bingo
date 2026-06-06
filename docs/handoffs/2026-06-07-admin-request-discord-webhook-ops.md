# Event Bingo Discord Webhook Ops Handoff

## 목적

Event Bingo 이벤트 관리자 신청이 접수될 때 운영 채널로 Discord 웹훅 알림을 보냅니다.

## 전제

- 애플리케이션 변경 브랜치: `feat/admin-request-discord-webhook`
- 백엔드는 `ADMIN_MANAGER_REQUEST_WEBHOOK_URL`이 있을 때만 웹훅을 전송합니다.
- Discord 웹훅 URL은 외부 공개 레포에 평문으로 커밋하면 안 됩니다.
- 신청자 이름과 이메일은 웹훅 알림에 넣지 않고, 신청 ID와 행사 정보만 전송합니다.

## DevFactory-Ops 작업

대상:

- 레포: `Pseudo-Lab/DevFactory-Ops`
- 파일: `services/event-bingo/overlays/prod/sealed-secret.yaml`
- Kubernetes Secret: `event-bingo-backend-runtime-secrets`
- Namespace: `event-bingo`

필수 환경변수:

```text
ADMIN_MANAGER_REQUEST_WEBHOOK_URL=<Discord webhook URL>
```

선택 환경변수:

```text
ADMIN_MANAGER_REQUEST_WEBHOOK_PROVIDER=discord
ADMIN_MANAGER_REQUEST_WEBHOOK_USER_AGENT=EventBingoWebhook/1.0
```

현재 앱 기본값이 `discord`와 `EventBingoWebhook/1.0`이므로 운영에서는 `ADMIN_MANAGER_REQUEST_WEBHOOK_URL`만 추가해도 됩니다.

## SealedSecret 생성 예시

실제 Discord 웹훅 URL은 명령 실행 시에만 입력하고, 결과로 나온 암호화 문자열만 `sealed-secret.yaml`에 넣어 주세요.

```bash
printf '%s' '<Discord webhook URL>' | kubeseal --raw \
  --cert sealed-secrets-public-cert.pem \
  --name event-bingo-backend-runtime-secrets \
  --namespace event-bingo \
  --scope strict \
  --from-file=ADMIN_MANAGER_REQUEST_WEBHOOK_URL=/dev/stdin
```

`sealed-secret.yaml`의 `encryptedData`에 아래 키를 추가합니다.

```yaml
encryptedData:
  ADMIN_MANAGER_REQUEST_WEBHOOK_URL: <kubeseal raw output>
```

주의:

- Discord 웹훅 URL 원문을 Git commit, PR 본문, 로그에 남기지 마세요.
- DevFactory-Ops가 public 레포이면 SealedSecret 암호문만 커밋해야 합니다.
- `event-bingo-backend-runtime-secrets`를 backend deployment가 `envFrom`으로 읽는지 확인해 주세요.

## 배포 순서

1. Event Bingo 애플리케이션 변경을 먼저 배포합니다.
2. DevFactory-Ops에서 SealedSecret 변경을 머지합니다.
3. ArgoCD sync 후 backend pod가 새 Secret 값을 읽도록 재시작되었는지 확인합니다.

## 검증

1. 운영 backend pod에서 환경변수 존재 여부를 확인합니다. 값 원문은 출력하지 않는 것이 안전합니다.

```bash
kubectl -n event-bingo exec deploy/event-bingo-backend -- sh -lc \
  'test -n "$ADMIN_MANAGER_REQUEST_WEBHOOK_URL" && echo set || echo missing'
```

2. 이벤트 관리자 신청을 1건 생성합니다.
3. Discord 운영 채널에 새 신청 알림이 도착하는지 확인합니다.
4. 알림에 신청자 이름과 이메일이 노출되지 않는지 확인합니다.


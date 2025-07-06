# 빙고 사용하는 방법

### 수정해야할 폴더

```
frontend
├─public        
│  └─templates // 개인 정보 관련 마크다운 파일
└─src
   └─config // 빙고, 행사 관련 정보 입력
```

### 1. 행사 정보 입력
config 폴더 내 settings.json에 있는 내용을 변경해서 사용
(헹사 날짜, 행사 장소, 주최자 등 설정)

### 2. 빙고 관련 추가 설정
config 폴더 내 bingoConfig.ts에 있는 내용을 변경해서 사용
unlockTime: 빙고 시작 시간, 시작 시간 이전까지는 타이머 페이지만 보임
keywordCount: 유저가 고를 수 있는 키워드 개수 (default: 3)
bingoMissionCount: 빙고 완료 조건 개수 (default: 3 빙고)

### 3. 빙고 키워드 변경
config 폴더 내 bingo-keywords.json에 있는 키워드 1~24를 원하는 키워드로 변경해서 사용

### 4. 개인 정보 동의 관련 내용 변경
public/templates 폴더 내 consent.md 파일 변경해서 사용
{host} 부분은 settings.json에 설정된 host값을 그대로 사용하니 그대로 두고 사용하세요.

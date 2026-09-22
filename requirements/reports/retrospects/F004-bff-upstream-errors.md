# F004 슬라이스 5 — 서버 4xx 전달 · explain 인증 · GET 재시도 (BFF) — 회고

- 브랜치: `feat/f004-bff-slice4`
- 날짜: 2026-09-22
- 체크리스트: `requirements/reports/checklists/F004-bff-upstream-errors.md`

## 1. 무엇을 했나

"BFF 슬라이스 4" 로 계획한 것 중 **BFF 만으로 닫히는 것**만 했다. 착수해 보니 `/coach/report` ·
`scoreboard` · `generation-status` 가 부를 서버 엔드포인트가 없고, `generate` 는 아직 동기 LLM 호출이라
1s · 202 · 쿨다운 429 를 걸 대상이 없었다. 남은 것은 서버가 먼저다.

## 2. 잘 유지된 것

- **고친 곳은 한 곳.** 컨트롤러마다 흩어진 `error.response` 분기(`market` · `watchlist` · 온보딩)를
  건드리지 않고 미들웨어 하나로 바닥을 깔았다. 기존 분기는 그대로 동작한다
- main 과 같은 요청으로 전후를 쟀다(500 → 401 · 400)
- `explain` 은 게이트 판정 · 본문 가공 · 로깅 0건 — 중계만

## 3. 남은 기술부채

- **컨트롤러별 upstream 에러 분기가 이제 중복이다.** `market.controller` · `watchlist.controller` ·
  `proxyHandler` 가 각자 `error.response` 를 본다. 미들웨어로 모을 수 있다
- 경로별 타임아웃 · 재시도가 서비스 상수로 흩어져 있다(지난 회고와 같은 지적). 호출 맵을 표 하나로
- `proxyRequest`(무인증) 주석이 "LLM 호출은 별도 타임아웃 30s" 인데 LLM 경로가 더는 쓰지 않는다
- 동시 상한 · 요청 제한이 인프로세스 — 프로세스가 둘이 되면 상한도 둘이 된다

## 4. 다음에 보완할 규칙 · 문서

- `backend-integration.md` "실패 처리"에 **"4xx 보존은 error middleware 가 한다 — 서비스에서 따로
  잡지 않는다"** 를 한 줄. 이번 수정이 규칙을 코드로 올렸다
- 작업 전 **서버에 부를 엔드포인트가 있는지**를 계획 단계에서 확인한다. 이번 범위 축소는 착수 후에야 드러났다

## 5. 추가 검증 제안

- 서버가 쿨다운을 내면 `Retry-After` 가 헤더로 도착하는지 실측
- 해설 버튼이 생기면 화면 이탈 시 서버 LLM 호출이 끊기는지 서버 로그로 확인

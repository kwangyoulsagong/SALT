# BFF-REQ-045 회고 (2026-11-03, S0)

- 서버 호출이 `backendApi` 한 곳이라 스위치를 인터셉터에만 붙일 수 있었다 — 서비스 26곳 무변경. 규칙(`backend-integration.md`)에 "서버를 부르는 새 axios 클라이언트를 만들지 않는다"를 더해 이 성질을 지킨다.
- 쓰기 그림자 금지는 단위 판정 함수만으로 부족해 흉내 서버 둘로 실제 클라이언트를 돌려 4종 0건을 봤다(수용 기준 문장 그대로).
- 그림자 · 골든 기록에 값을 남기지 않게 "첫 차이 경로만"으로 설계했다 — 금액이 파일에 쌓이지 않는다.
- OpenTelemetry SDK 대신 W3C traceparent 만 — 수집처가 없는데 SDK 를 넣으면 쓰지 않는 의존만 는다. FR-7 줄에 그렇게 적었다.

## Action

- S1 첫 경로(저축)부터 골든 녹화 → shadow → 1주 리포트 순서 그대로(`msa-services.md` §7)

## 2026-11-03 — 리뷰 뒤

- "토큰을 녹화하지 않는다"를 요청 헤더만 보고 썼다 — 응답 본문(로그인)이 토큰을 든다. 녹화 · 로그 도구는 **응답 본문**까지 비밀 기준으로 본다
- 게이트는 "비교 0건 = 실패"가 기본이다. 0건 통과는 게이트가 아니다
- 깨끗한 이미지 빌드가 기존 결함(전역 tsc)을 드러냈다 — 빌드 도구는 package.json 에 있어야 한다

## 2026-11-03 — MONEY-S1a 저축 서비스 첫 판 · 저축 zone 첫 화면

- 걸린 몫은 위 체크리스트 한 줄. 근거 · 판단은 루트 회고 `requirements/reports/retrospects/MONEY-S1a-savings-calculator.md`. Action 없음

## 2026-11-04 — 가계부 S1a(`MONEY-S1-household-entry`)

- 새 도메인 경로는 그림자 단계 없이 바로 platform(옛 경로가 없다).

## 2026-11-04 — 추적 ID 테스트

- 운영에서는 맞고 테스트에서만 틀린 실패를 "기존 결함"으로 몇 슬라이스 넘겼다. 모듈 로드 횟수를 찍자 바로 보였다 — 모듈 수준 상태(AsyncLocalStorage · 캐시)를 쓰는 테스트는 앱과 같은 로더로 불러야 한다.
- Action: 테스트에서 env 를 먼저 넣고 불러야 하면 `await import()` 대신 `require`. 모듈 수준 상태를 테스트가 직접 잡으면 로드 횟수부터 의심한다.


## 2026-11-05 — FE-REQ-013 FR-80 2단계

- 파일만 걸침(토큰 운반이 쿠키로) — Action 없음

## 2026-11-05 — 금융 팁 S2a(`MONEY-S2a-tips-content`)

- 몫: 라우팅 표에 `/content` → platform 한 줄(금융 팁 `/api/app/tips`). 스위치 · 그림자 동작 무변경
- **Action**: 없음 — 기존 결정 위에 한 줄

## 2026-11-06 — 서버 S2c notification(`MONEY-S2c-notification`) · `9cee4715` · `33e949e8` · `2fa68f61` · `f1a3c64c`

- 파일만 걸침 — 이 REQ 를 머리 주석에 둔 파일을 S2c 가 고쳤다. 판단 · 실수는 루트 회고 `MONEY-S2c-notification`
- **Action**: 없음(이 몫 안)

## 2026-11-06 — 서버 S3a identity 셸 설정(`MONEY-S3a-identity-shell`)

- 없음 — 새 서비스는 표 한 줄

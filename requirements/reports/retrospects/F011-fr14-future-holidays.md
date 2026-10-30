# F011 슬라이스 — 미래 휴장일(FR-14) · KRX 휴장일 공시 표 — 회고

영역 회고: `salt-server/requirements/reports/retrospects/SRV-REQ-040.md` · `DB-REQ-033.md` ·
`salt-forecast/requirements/reports/retrospects/FC-REQ-009.md` · `FC-REQ-020.md` · `bff/requirements/reports/retrospects/BFF-REQ-040.md` ·
`salt-microFe/requirements/reports/retrospects/FE-REQ-041.md`

## 요약

- **3주 동안 "부분"이던 FR-14 는 API 를 기다릴 일이 아니었다.** 미래 휴장은 1년에 한 번 공시되는 15줄 표다. KIS 키 권한(실전 키 — 사용자가 쓰지 않기로 함)을
  기다리는 동안 매일 아침 "달력 추정"이 떴고, 연휴 전날 다음 개장이 휴장일로 나왔다
- **지난날 역산이 표의 시험지였다.** 공시 표를 손으로 옮겨도 2026 줄 15개 중 10개월치가 실제 체결과 대조된다 — 제헌절(7-17) 공휴일 재지정도 역산이 먼저 알고 있었다
- **같은 표를 예측이 읽는다는 걸 서버 쪽만 봤으면 놓쳤다.** 미래 개장일이 "원천 멈춤" 감지(`presumed_weekdays`)를 끈다 — 에러 없이. 소비처(`krx_open_dates`)를 grep 한 것이 잡았다

## Action

- 공유 표에 **미래 행**을 처음 쓰는 변경은 읽는 쪽이 "마지막 행 = 최신 관측"으로 가정하는지 먼저 본다(`max(...)` · 마지막 날짜 grep)
- 2026-12 KRX 공시 뒤 `KRX_NOTICE_CLOSURES` 에 2027 줄 · `KRX_NOTICE_COVERED_THROUGH` 이동(12-01 부터 경고 로그가 알린다)
- 휴장 사유 이름(FR-41)은 표에 이미 있다 — 응답 · BFF · 화면만 남았다

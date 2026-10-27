# F000 슬라이스 — 동면 410 · 홈 조립 · /tax 링크 — 회고

영역 회고: `salt-server/requirements/reports/retrospects/SRV-REQ-009.md` · `SRV-REQ-007.md` ·
`bff/requirements/reports/retrospects/BFF-REQ-007.md` · `salt-microFe/requirements/reports/retrospects/FE-REQ-030.md`

## 요약

- **"부분"으로 한 달 남아 있던 것은 서버 · BFF 짝이었기 때문이다** — BFF 410(09-22)은 영역 하나라 바로 닫혔고, 서버 410 은
  BFF 홈 조립을 같이 고쳐야 해서 "사용자 지시 시"로 밀렸다. 같은 PR 로 묶으니 30분 일이었다
- **되살리기 테스트가 기존 결함을 찾았다** — 동면 대상 셋(`dashboard` · `feed` · `investment-insight/top`)이 동면 전부터
  언제나 500 이었다. 그래서 BFF `/api/app/home` 은 main 에서도 실패하고 있었다(프론트 호출 0건이라 아무도 몰랐다)
- **zsh 는 `set -- $var` 를 단어로 나누지 않는다** — 실측 루프가 전부 400 으로 찍혀 결함으로 읽을 뻔했다. 로그(410 기록)가 먼저 사실을 말했다

## Action

- 2026-11-03 서버 410 로그 확인 → `SRV-REQ-009` FR-7 수용 기준 · 이 슬라이스 `done/`
- 동면 코드를 되살릴 때 라우터의 메서드 바인딩(화살표 함수)부터 고친다 — `SRV-REQ-007` Open Question 에 적었다

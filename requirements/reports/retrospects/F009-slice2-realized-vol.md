# F009 슬라이스 2 — 실현 변동성 — 회고

영역 회고: `salt-forecast/requirements/reports/retrospects/FC-REQ-006.md`

- 슬라이스 1 이 계약(`RealizedVolatility`)을 먼저 열어 둔 덕에 서버 변경이 정말 메서드 하나였다. 응답 계약 변경 0
- 처음 구현은 채점 창에서 EWMA · GARCH 중 나은 쪽을 골랐다. 그러면 그 창의 QLIKE 가 선택 편향된 채로 게이트를 통과한다 —
  `time-and-leakage.md` §4 에 걸려 EWMA 고정 + GARCH 도전자로 바꿨다. 좋은 숫자(GARCH 62% 우세)를 쓰지 않은 결정이다
- ETH 가 31일 내내 막혔다. 게이트가 흔들려서가 아니라 EWMA(유효 창 약 16일)가 60일 분산보다 지속적으로 나빴다.
  주요 종목이 값 없음이라 사용자에겐 불편하다 — 규칙을 지켰고 사용자 결정으로 남긴다

## Action

- 슬라이스 3: 변동성 칸이 `insufficient_data` 일 때 화면 문구가 "왜"(이력 부족 · 기준 대비)를 말할지 정한다 — 지금 서버 응답은 사유를 한 종류로 준다
- 26주 뒤: `realized-vol` 리포트를 라이브 창으로 다시 만들어 GARCH 승격(FR-9)

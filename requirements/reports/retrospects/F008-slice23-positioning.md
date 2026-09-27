# F008 슬라이스 23 — 쏠림 신호 — 회고

영역 회고: `salt-forecast/requirements/reports/retrospects/FC-REQ-007.md` · `salt-server/requirements/reports/retrospects/SRV-REQ-037.md` §슬라이스 23 · `bff/requirements/reports/retrospects/BFF-REQ-037.md` · `salt-microFe/requirements/reports/retrospects/FE-REQ-038.md`

- 계산 전에 데이터부터 쟀다 — 환율 지연(9일)과 사건 수(BTC 김프 교차 41 · 펀딩 쏠림 10)를 먼저 보고 소스를 더하고 게이트가 어디서 막힐지 알았다. 롱 쏠림 BTC 가 `failure_cases_missing` 으로 막히는 것은 예상대로다
- 주요 사건의 뼈대를 네 영역에서 그대로 썼다. 새 슬라이스의 대부분은 **정의**(동률 · 확정 · 국면)였고, 테스트가 부동소수 동률 버그를 잡았다 — 사건 수가 조용히 20% 틀릴 뻔했다
- 기획서 "과열 배지"는 판정어다. 백분위 구간 + 통상 해석으로 바꿨다 — 주요 사건의 "호재 · 악재 판정 아님"과 같은 결론이 다른 이름으로 다시 나왔다
- 화면 확인은 실 DB 값을 서버 유스케이스로 뽑아 고정 응답으로 썼다. 가짜 숫자가 아니라 실제 모양이라 표기 문제(유효 자릿수)를 바로 잡았다

## Action

- 로그인 QA: 실 토큰 한 바퀴 · 200% · 대비
- 다음 날 `job_run` 에서 `signals` 단계가 매일 배치로 돌았는지 확인
- 다음 P2 슬라이스 후보: 국면 카드 · ETF 유입 · CPCV · DSR(다중 비교를 여기서)

# F009 슬라이스 6 — 월간 복기 · Brier · 진입 전 체크 · IPS · 시나리오 — 회고

영역 회고: `salt-server/requirements/reports/retrospects/SRV-REQ-038.md` · `DB-REQ-031.md` · `bff/requirements/reports/retrospects/BFF-REQ-038.md` · `salt-microFe/requirements/reports/retrospects/FE-REQ-039.md` §슬라이스 6

- 착수 전에 네 가지를 물었다(범위 · 3문항 자리 · Brier 입력 · 복기 저장). 기획서가 "코치 대화"를 전제했는데 웹에 대화 화면이 없다는 것을 코드에서 먼저 확인한 덕에 질문이 구체적이었다
- 슬라이스 5 회고 Action("복기는 미러 응답에 요약 필드")과 다르게 갔다 — 사용자가 월초 저장을 골랐다. Action 은 제안이지 결정이 아니다
- 서버를 먼저 끝내고 실 DB 로 유스케이스를 돌린 뒤 계약(`@repo/core`) → BFF → 프론트 순으로 갔다. 계약이 서버 응답 변환과 같은 모양이라 BFF 는 모양 검사만 했다
- 화면을 띄워서 네 가지를 고쳤다(체크박스 보라 · 세리프 제목 · 단위 고르기 줄바꿈 · vanilla-extract 선택자). 타입 · 린트 · 테스트로는 하나도 안 잡혔다

## Action

- 로그인 QA: 실 토큰으로 복기 첫 조회 지연 · size-check p95(체크리스트 포함) · 200% 확대
- 2026-10-01 뒤 워커 로그로 9월 복기 생성 확인
- `@repo/ui` 대비 정리 REQ(슬라이스 5 부터 열린 채)

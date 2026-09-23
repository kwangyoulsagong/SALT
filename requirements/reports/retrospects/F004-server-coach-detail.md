# F004 슬라이스 12 — 서버 코치 상세 — 회고

영역 회고: `salt-server/requirements/reports/retrospects/SRV-REQ-025.md` · `SRV-REQ-024.md`

- 미결로 넘긴 질문의 답이 짝 REQ(`DB-REQ-019` FR-45)에 있었다. 질문을 넘기기 전에 짝 REQ 매핑 절을 먼저 찾는다
- 막히는 것이 이 슬라이스의 결과다. 화면을 채우려고 다른 판단의 성적을 빌려 오지 않았다
- 인증 실측은 BFF 경유가 정석이다 — 서버 단독 토큰 발급에 기대지 않는다

## Action

- PM: 저장 추천의 적중 규칙(매도 · 관망 · 리밸런싱)
- BFF `/api/app/coach/report` — 다음 BFF 슬라이스
- 쿨다운 · 프로필 축(마이그레이션 2개) — 다음 서버 슬라이스

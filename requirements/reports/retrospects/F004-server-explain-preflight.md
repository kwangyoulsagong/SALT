# F004 슬라이스 10 — 서버 explain · preflight — 회고

영역 회고: `salt-server/requirements/reports/retrospects/SRV-REQ-025.md` · `salt-microFe/requirements/reports/retrospects/FE-REQ-026.md`

- BFF 를 먼저 관대하게 만들어 둔 덕에 서버 인증 전환에 BFF 변경이 0 이었다
- 로컬 판단 표본이 없어 LLM 경로를 실측할 수 없다 — 시드가 필요하다

## Action

- 판단 표본 시드 스크립트 — 다음 서버 슬라이스
- 주문 전 체크 화면 — 다음 FE 슬라이스

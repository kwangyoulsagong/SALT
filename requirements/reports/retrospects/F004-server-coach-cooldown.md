# F004 슬라이스 13 — 서버 쿨다운 · 프로필 — 회고

영역 회고: `salt-server/requirements/reports/retrospects/SRV-REQ-025.md` · `DB-REQ-017.md`

- 비동기로 바꾸면 **기록 시점**이 판단이 된다 — 받는 순간 쓴다
- 응답 필드 제거 · 상태 코드 변경 전에 소비처를 grep 으로 확인하고 커밋에 남겼다
- 새 관측 기록이 로컬 워커 중복 실행을 처음 보여 줬다

## Action

- BFF 슬라이스: `/api/app/coach/report` · `generation-status` · 202/429 실측
- 생성 기록 보존 정책

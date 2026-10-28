# F000 슬라이스 — 알림 1종 · 코드만 · 금액 없음 — 회고

영역 회고: `salt-server/requirements/reports/retrospects/SRV-REQ-008.md` · `SRV-REQ-009.md` · `SRV-REQ-007.md` · `SRV-REQ-006.md` ·
`SRV-REQ-028.md` · `SRV-REQ-029.md` · `DB-REQ-022.md` · `bff/requirements/reports/retrospects/BFF-REQ-007.md` · `BFF-REQ-008.md`

## 요약

- **"Must, 미구현"이 한 달 간 이유는 규칙을 걸 자리가 없어서였다** — 알림을 만드는 코드가 코치 어댑터 안에서 테이블에 직접 썼다. 컨텍스트를 세우니 관문은 순수 함수 둘이었다
- **"금액 금지"를 키 이름으로만 막으면 샌다** — 실경로 시험에서 서버가 `avgPrice: "91000000"`(직접 넣은 행)을 실어 왔고 BFF 가 막았다. 숫자 금지 · 문자열만으로 좁혔다
- **상시 서버 재시작이 한 번 EADDRINUSE 로 죽었다** — kickstart 직후 옛 프로세스가 포트를 놓기 전에 새 프로세스가 떴다. 두 번째 kickstart 로 떴다. 확인은 로그가 아니라 `lsof` LISTEN 으로 했다(기존 규칙대로)
- 세션 시작 때 이전 세션들이 끄지 않은 BFF 3벌이 4001 을 잡고 있었다 — 그대로 띄웠으면 옛 코드가 응답했다

## Action

- 없음 — 남은 F006 몫은 `SRV-REQ-028` Changelog 2026-10-28 행에 있다

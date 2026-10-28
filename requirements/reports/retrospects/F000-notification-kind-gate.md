# F000 슬라이스 — 알림 1종 · 코드만 · 금액 없음 — 회고

영역 회고: `salt-server/requirements/reports/retrospects/SRV-REQ-008.md` · `SRV-REQ-009.md` · `SRV-REQ-007.md` · `SRV-REQ-006.md` ·
`SRV-REQ-028.md` · `SRV-REQ-029.md` · `DB-REQ-022.md` · `bff/requirements/reports/retrospects/BFF-REQ-007.md` · `BFF-REQ-008.md`

## 요약

- **"Must, 미구현"이 한 달 간 이유는 규칙을 걸 자리가 없어서였다** — 알림을 만드는 코드가 코치 어댑터 안에서 테이블에 직접 썼다. 컨텍스트를 세우니 관문은 순수 함수 둘이었다
- **"금액 금지"를 키 이름으로만 막으면 샌다** — 실경로 시험에서 서버가 `avgPrice: "91000000"`(직접 넣은 행)을 실어 왔고 BFF 가 막았다. 숫자 금지 · 문자열만으로 좁혔다
- **상시 서버 재시작이 한 번 EADDRINUSE 로 죽었다** — kickstart 직후 옛 프로세스가 포트를 놓기 전에 새 프로세스가 떴다. 두 번째 kickstart 로 떴다. 확인은 로그가 아니라 `lsof` LISTEN 으로 했다(기존 규칙대로)
- 세션 시작 때 이전 세션들이 끄지 않은 BFF 3벌이 4001 을 잡고 있었다 — 그대로 띄웠으면 옛 코드가 응답했다

- **시험 행 시간대 착오** — `psql now()` 는 `Asia/Seoul` 이고 Prisma 는 `timestamp` 를 UTC 로 읽어 만료 행이 9시간 미래가 됐다(정리 0건을 결함으로 읽을 뻔). 시험 행은 `now() at time zone 'utc'` 로 넣는다
- 같은 이유로 "알림 행이 생기면 깨는" 대기 조건이 제 시험 행에 걸려 일찍 깼다 — 조건을 `source='ai_coach'` · 인사이트 `generatedAt` 변화로 좁혀 다시 기다렸다
- 검증 중 본 "400(Zod)까지 `error` + 스택"을 처음엔 범위 밖으로 적었다 — 사용자 "고쳐야지". 고치다 보니 접근 로그가 처음부터 `[object Object]` 였고 BFF 인터셉터는 원인을 버리고 있었다(`a26be7d` · `0d1e670`)

## Action

- 없음 — 남은 F006 몫은 `SRV-REQ-028` Changelog 2026-10-28 행에 있다

# F004 슬라이스 13 — 서버 쿨다운 · 프로필 — 체크리스트

슬라이스: `requirements/specs/in-progress/F004-server-coach-cooldown-slice.md` · 2026-09-23
브랜치: `feat/server-f004-coach-cooldown` (base `feat/server-f004-coach-detail` `579535e` — 슬라이스 12 문서와 겹쳐 그 위에서 땄다)
영역 체크리스트: `salt-server/requirements/reports/checklists/SRV-REQ-025.md` §9 · `SRV-REQ-024.md` · `DB-REQ-017.md`

## 요약

| 확인 | 결과 |
|---|---|
| 마이그레이션 | 2개 · 추가뿐 · `--create-only` 로 SQL 확인 후 `deploy` · `prisma validate` · `migrate status` 통과 |
| 프로필 | 저장 → DB 열 → 재조회 일치 · `mode` 없는 종목 판단이 저장한 `long_term` 을 따름 · 원복 후 `scalp` |
| 재생성 | 받음 **5ms**(202 경로) → 즉시 재요청 **거부 300초** → 48ms 뒤 `succeeded` |
| 상태 | 거부 행이 `lastRequest` 에 안 보임 · 진행 중 → 끝남 전환 |
| 쿼리 계획 | 새 쿼리 2개 모두 새 인덱스 · 0.05ms 미만 |
| 무토큰 | `generate` · `generation-status` 401 |
| 게이트 | `npm run build` · `npm test` **318 pass**(+19) · `npm run lint` · `test:layer-check` · `layer-check` 사후 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 인증된 HTTP 202 · 429 | 로컬 토큰 발급이 세션 권한에서 막혔다. 유스케이스를 실제 어댑터로 불렀다 | BFF 경유 — `BFF-REQ-025` FR-3 · 4 |
| BFF 의 `Retry-After` 전달 | 이 조합으로 돌려 보지 않았다 | 위와 같이 |
| 생성 기록 보존 | 정리 작업 없음 | 관측성 계측 |
| 로컬 워커 중복 실행 | 로컬 `src/server.ts` 두 벌 — 생성이 매번 두 번. 코드 문제 아님 | 사용자 로컬 정리 |

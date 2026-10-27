# F000 슬라이스 — 동면 410 · 홈 조립 · /tax 링크 — 체크리스트

슬라이스: `requirements/specs/in-progress/F000-dormant-410-slice.md` · 2026-10-27
브랜치: `chore/adr-002-remnants` (base `main` `9331645`)
영역 체크리스트: `salt-server/requirements/reports/checklists/SRV-REQ-009.md` §9 · `SRV-REQ-007.md` ·
`bff/requirements/reports/checklists/BFF-REQ-007.md` §10 · `salt-microFe/requirements/reports/checklists/FE-REQ-030.md`

## 1. 커밋

| 커밋 | 영역 | 되돌리면 |
|---|---|---|
| `d344a50` feat(server) | 동면 8경로 410 · `goneMiddleware` | 서버 동면 경로가 다시 열린다(`/api/dashboard` 등은 원래 500) |
| `545270b` fix(bff) | 홈 조립 `allSettled` · 동면 호출 0 · 뷰모델 | **서버 커밋이 남아 있으면 `/api/app/home` 이 410 으로 실패** — 둘을 같이 되돌린다 |
| `e2f2dfc` fix(fe) | 홈 `/tax` 링크 제거 | 홈에 "세금 마감 콕핏" 링크가 돌아온다 |

## 2. 요약

| 확인 | 결과 |
|---|---|
| 서버 실경로(워커 없는 스크래치 4100) | 동면 8경로 410 `ENDPOINT_DORMANT` · `revivable: true`(`POST /api/missions/x/start` 하위 경로 포함) · 유지 경로 `/api/users/profile` · `/investment-insight/insights` · `/investment-notifications/unread-count` 401(인증으로 그대로) · `/api/nope` 404 |
| 1회 로그 | 7개 마운트 지점 호출(같은 경로 반복 포함) → 로그 7줄 |
| 되살리기 1회 | 목록에서 `/api/missions` 를 빼고 라우트를 다시 걸면 **200**(소유자 토큰), 나머지는 410 그대로. `/api/dashboard` 로 먼저 했더니 **500** — 동면 전부터 있던 결함(§4) |
| BFF 실경로(4101 → 스크래치 4100) | `GET /api/app/home` 소유자 토큰 **200 · 70ms** · `degradedBlocks: []` · 보유 0 · 시장 20 · 안 읽은 알림 0 |
| 프론트 | 홈 `/tax` 링크 0건(`apps/web/src` grep — `robots.ts` disallow 만 남음) |
| 게이트 | 서버 `build` · `lint` · `test` 820 · `test:layer-check` · BFF `build` · `test` 278 · 모노레포 `check-types` 5/5 · `lint` 5/5 · `test` 2/2 · `web` · `web-tax` 빌드 · 파이썬으로 쓴 4파일 레이어 훅 사후 실행 exit 0 |

## 3. 짝 · 참조 REQ — 변경 없음

| REQ | 왜 안 바뀌나 |
|---|---|
| `BFF-REQ-027` · `BFF-REQ-028` | F006 홈 블록별 최종 형태 — 이번은 F000 최소 구성까지 |
| `FE-REQ-008` FR-26 | 홈 경계 수 2 그대로(링크는 경계 밖) |
| `FE-REQ-013` | 서버 스트리밍 전환 — 무관 |
| `BFF-REQ-008` FR-11 · `BFF-REQ-036` | BFF 동면 목록 그대로 |

## 4. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 서버 410 로그 1주 잔여 0건(`SRV-REQ-009` FR-7 수용 기준) | 시간 게이트 — 상시 서버(4000)는 작업 트리 코드라 이 브랜치가 머지되고 재시작된 뒤부터 센다 | 2026-11-03 |
| 동면 컨트롤러 `this` 결함 — `/api/dashboard` · `/api/feed` · `/api/investment-insight/top` | 라우터가 묶이지 않은 메서드를 넘겨 `this.service` 가 없다(언제나 500). 동면 코드라 고치지 않는다 | 되살리는 PR |
| 웹 홈 화면 실측(링크 사라진 모습) | 링크 한 줄 제거 · 경계 · 블록 변경 없음 — `web` 빌드 · 타입 · lint 로만 확인 | 다음 홈 화면 작업(F006 `FE-REQ-030` 3블록) |
| `apps/web-tax` zone | 아키텍처 결정 | 사용자 결정(ADR-002 §5) |

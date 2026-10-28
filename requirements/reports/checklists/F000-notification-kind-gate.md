# F000 슬라이스 — 알림 1종 · 코드만 · 금액 없음 — 체크리스트

슬라이스: `requirements/specs/in-progress/F000-notification-kind-gate-slice.md` · 2026-10-28
브랜치: `feat/f000-notification-kind-gate` (base `main` `b40f257`)
영역 체크리스트: `salt-server/requirements/reports/checklists/SRV-REQ-008.md` · `SRV-REQ-009.md` · `SRV-REQ-007.md` · `SRV-REQ-006.md` ·
`SRV-REQ-028.md` · `SRV-REQ-029.md` · `DB-REQ-022.md` · `bff/requirements/reports/checklists/BFF-REQ-007.md` · `BFF-REQ-008.md`

## 1. 커밋

| 커밋 | 영역 | 되돌리면 |
|---|---|---|
| `3320883` feat(server) | `notification` 컨텍스트 · 마이그레이션 · 코치 어댑터 | 알림 항목이 문장 모양으로 돌아간다 — **BFF 커밋이 남아 있으면 `alerts` 가 빈 배열**(항목에 `kind`/`messageCode` 가 없어 전부 버린다). 둘을 같이 되돌린다. 스키마는 migration 머리 SQL 로 |
| `ed1615f` feat(bff) | `alerts.viewmodel` | `/api/app/alerts` 가 서버 envelope 를 그대로 넘긴다 |
| `a26be7d` fix(server) | 4xx 로그 warn · 접근 로그 | 4xx 가 다시 error + 스택 · 접근 로그 `[object Object]`. 응답은 같다 — 단독 revert 가능 |
| `0d1e670` fix(bff) | 같은 수정 + 인터셉터 원인 누락 | 같음 — 단독 revert 가능 |
| `a7706d7` · `0be9644` fix | 로거가 문자열 원인을 버리던 것(서버 · BFF) | 실패 로그 원인이 다시 빠진다 — 단독 revert 가능 |
| `ffc0732` fix(server) | 모르는 종목 500 → 404 | 틀린 심볼이 다시 500 — 단독 revert 가능 |

## 2. 요약

| 확인 | 결과 |
|---|---|
| 단위 | 서버 알림 9(종류 4 거부 · 문장 코드 4 거부 · 금액 5 거부 · 읽기 1종 · 페이지) · BFF 뷰모델 4 |
| 실 DB 발행 | 코치 어댑터 → 공개 API → 행 `signal_update` · `coach.decision_changed` · `title`/`message` NULL · 24시간 만료 · 중복 억제 false → true · `decision_change` 발행 422 코드 |
| 서버 실경로(상시 4000, 재시작) | 목록 1종만(옛 행 숨김) · 숫자 인자 빠짐 · 안 읽은 수 1 · 모두 읽음이 옛 행 안 건드림 · 단건 읽음도 · `size=500` 400 · 무인증 401 |
| BFF 실경로(4001) | `{ alerts: 2건 최신순, unreadCount: 2 }` · 서버가 실은 `avgPrice` 문자열 제거 · `/api/app/home` 200 |
| 코치 워커 실제 회차 | 상시 서버 코치 워커 실제 회차(10:50): 테스트 계정 직전 판단을 `wait` → `hold` 로 바꿔 두자 다음 회차가 `signal_update` · `ai_coach` · `coach.decision_changed` · 인자 `{ mode, symbol, previousAction, nextAction }` · 문장 NULL · 24시간 만료 1건을 만들었다. 다시 `hold` 로 바꾼 11:00 회차는 **2시간 억제로 0건 추가**. 판단은 회차가 원래 값(`wait`)으로 덮었고 시험 알림은 지웠다 |
| 로그 레벨(사용자 지시로 추가) | 서버 · BFF 4xx → `warn` 한 줄(상태 · 코드 · 사유 · 경로), 5xx 만 `error` + 스택. 실로그 400 · 401 확인 — 영역 체크리스트 `SRV-REQ-006` · `BFF-REQ-025` |
| 로거 · 모르는 종목(후속) | 문자열 원인 로그 복구(`Upbit API error: …404`) · `/crypto/NOPEZZ/price` · `/NOPEZZ/sentiment` 500 → 404 · BTC 200 — `SRV-REQ-006` · `SRV-REQ-009` · `BFF-REQ-025` |
| 홈 · 알림 BFF(실제 행) | `/api/app/alerts` 1건 · `unreadCount: 1` · `/api/app/home` `unreadNotifications: 1` · `degradedBlocks: []` |
| 마이그레이션 되돌리기 | migration 머리 SQL 을 NULL 문장 행이 있는 상태로 트랜잭션 안에서 실행 → `title` · `message` NOT NULL · `messageCode` 삭제 성공 → ROLLBACK 후 원상태 |
| 실행 계획 | 목록 · 안 읽은 수 `InvestmentNotification_userId_isRead_idx` · 억제 조회 `symbol` 인덱스(행 0이라 seqscan 끄고 확인 — 24시간 만료라 사용자당 소량) |
| 만료 정리 워커 | 새 모양 행: 만료 1 삭제 · 유효 1 유지 |
| 시험 행 | `qa-*` · 실제 회차 알림 전부 삭제 — 알림 0행(시작과 같음) |
| 게이트 | 모노레포 `check-types` · `lint` 5/5(프론트 변경 없음 — 캐시) · 서버 `build` · `lint` · `test` 829 · `test:layer-check` · `prisma generate` · Swagger `failOnErrors` · Bash 로 쓴 18파일 레이어 훅 사후 실행 exit 0 · BFF `tsc` · `test` 282 |

## 3. 짝 · 참조 REQ — 변경 없음

| REQ | 왜 안 바뀌나 |
|---|---|
| `FE-REQ-030` · `FE-REQ-011` FR-44 | `/api/app/alerts` 소비처 0건(웹 · 모바일 grep). 문장 매핑은 첫 화면이 생길 때 |
| `BFF-REQ-007` B절 · `app-home` | 안 읽은 수 경로 · 모양 같음(`unreadCount`) — 실경로 200 |
| `SRV-REQ-008` FR-23 | 센티먼트 · 고래 조회 경로 무변경 |
| `notification-cleanup.worker` | `expiresAt` 삭제 그대로 — 새 행도 24시간 만료 |

## 4. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 알림 화면 · i18n 문장 | 프론트 소비처 없음 | F006 `FE-REQ-030` |
| 여러 종목 시세에 틀린 심볼이 섞일 때 | Upbit 이 전체 404 — 빈 목록으로 바꾸면 정상 종목도 사라져 실패로 둔다. 서버가 고른 심볼이라 사용자 입력 아님 | 사용자 입력 다중 심볼 경로가 생길 때 |

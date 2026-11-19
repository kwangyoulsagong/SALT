# DB-REQ-040 — 체크리스트

## 2026-11-06 — 서버 S2c notification(`MONEY-S2c-notification`) · `9cee4715` · `33e949e8` · `2fa68f61` · `f1a3c64c`

- 몫: FR-3 `notification_pref(user_id, domain, enabled, updated_at)` — notification Flyway V1 · 도메인 CHECK 셋 · upsert 한 문장
- 수용 기준 2 충족(`NotificationSpec` · 종단 · 실스택 새 사용자)
- 미검증: 없음(이 몫 안)

## 2026-11-06 — 서버 S3a identity 셸 설정(`MONEY-S3a-identity-shell`) · `fc0207cb`

- FR-2: `services/identity/infrastructure/.../V1__baseline.sql` — `user_domain_pref`(+ outbox · processed_event · shedlock) · 모양 CHECK 다섯(고른 도메인 · 순서 넷 · 숨김 0~3 · 순서와 숨김 짝 · 끝은 고른 뒤)
- 검증: 종단 테스트 "DB 모양 검사 — 도메인 밖 값은 표가 막는다" · 로컬 운영 DB 적용 뒤 표 다섯 확인 · 임시 사용자 행 생성 → 삭제(0행으로 복귀)
- FR-1 · 4 · 5 · 6 은 S3b · S3c

## 2026-11-12 — 서버 S3b(`MONEY-S3b-identity-accounts`)

루트 `requirements/specs/in-progress/MONEY-S3b-identity-accounts-slice.md` · 체크리스트 `requirements/reports/checklists/MONEY-S3b-identity-accounts.md`

| 바뀐 것 | 확인 |
|---|---|
| FR-1 이동 · FR-5 서명 키 — Flyway V2 · 가져오기 대조 5 · 6 · 6 | 가져오기 두 번 같은 결과 · 덤프 복원 시험 |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 옛 표 drop 적용(승인 대기) | 되돌리기 어려운 DB 작업 · 이중 기간 | 승인 즉시 · 2026-11-27 |

## 2026-11-12 — 서버 S3c(`MONEY-S3c-identity-my-data`)

루트 `requirements/specs/done/MONEY-S3c-identity-my-data-slice.md`

| 바뀐 것 | 확인 |
|---|---|
| identity V3 `account_deletion_log` · 저축 V4 · 가계부 V9(원장 지우기 예외) | Testcontainers 종단 · 로컬 운영 DB 적용(identity 3 · savings 4 · household 9) · 기록에 사람 값 0 · 시험 기록 3행 지움 |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| ~~FR-6 `data_classification`~~ | S3c 범위 밖 | 서버 S3d — **닫힘 2026-11-13**(정정: 표 주석, 아래 S3d 절) |

## 2026-11-13 — 서버 S3d(`MONEY-S3d-identity-classify-usage`)

| 항목 | 결과 |
|---|---|
| FR-6 | Flyway 여섯 + Prisma 하나 — 로컬 운영 DB 적용(identity V5 · 가계부 V10 · 저축 V5 · 팁 V3 · 알림 V2 · ping V2 · Prisma `20261113090000`). 기존 영어 주석 넷은 한국어로 다시 |
| FR-7 | `usage_day` — PK 네 칸 · CHECK(해시 64 hex · 도메인 넷 · 종류 둘 · 횟수 > 0) · `on_day` 인덱스. jOOQ 코드 생성 통과(text 키 → varchar) |
| 실행 계획 | upsert `Conflict Arbiter Indexes: usage_day_pkey` · 주간 집계 PK 인덱스 스캔 |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 없음 | — | — |

## OPS-004 짝 (2026-11-13, `feat/f017-v4-s1d-coach-panel`)

| 항목 | 상태 | 근거 |
|---|---|---|
| `schema.prisma`(머리 주인)에 `PanelCellCheck`(`panel_cell_check` — 시장 층 · 사용자 열 0 · 30일) · 마이그레이션 `20261113200000_panel_cell_check`(표 하나 · 인덱스 하나 — 되돌리기 = 표 지우기) | 충족 | 로컬 DB `prisma migrate deploy` 적용 · 주인 체크리스트 `requirements/reports/checklists/OPS-004.md` |

## 2026-11-14 — F017 v4 2a 걸침(`SRV-REQ-058`)

- `schema.prisma` 끝에 `news_*` 표 다섯 모델을 더함(`SRV-REQ-058` 2a) — 이 REQ 의 identity 모델 무변경
- 검증은 `SRV-REQ-058` 체크리스트 — 이 REQ 의 기존 항목은 다시 열지 않음

## 2026-11-16 — F017 v4 순서 5 짝

- 공유 파일에 한 자리 — 이 REQ 기능 변경 없음. 검증 표는 루트 `requirements/reports/checklists/F017-v4-stage5-ontology.md`


## 2026-11-17 — F008 슬라이스 24 2단계(`feat/f008-slice24-s2-earnings-window`, 루트 `requirements/specs/in-progress/F008-slice24-kr-market-events-slice.md`)

이 REQ 몫: 짝(공유 파일 `schema.prisma`) — 새 표 `dart_earnings_filing` · `dart_earnings_sync`(사람 행 아님 · `user_id` 없음) · `news_ai_body.refetched_at`

| 항목 | 상태 | 근거 |
|---|---|---|
| 빌드 · 린트 · 레이어 | 충족 | `npm run build` 0 · `npm run lint` 0 · `npm run test:layer-check` 차단 10 · 통과 6 |
| 단위 시험 | 충족 | `npm test` 1730/1730 — 새 시험 `dartEarnings`(실제 원문 픽스처 9건 · 분류 경계 표 19 · 결산 이름 8) · `collectDartEarnings` 6 · `refetchDartBodies` 2 · `dartDecode` 2 · `earningsOutlook` 11 · `macroEvents` 경계 |
| 마이그레이션 | 충족 | `20261117120000` · `120100` · `120200` 로컬 적용 — 추가만(표 · 뷰 · CHECK 넓히기 · 열 하나) |
| 실데이터 수집 | 충족 | DART 실호출: 유니버스 51종목 2016~ 실적 공시 5,245 · IR 4,006 · 예고 586 · 최근 1년 IR · 예고 본문 561건 전부 읽음(실패 0) — 실적 IR 174 · 결산 기간 158 |
| 분류 표본 눈 확인 | 충족 | IR 12건 무작위 — 첫 판 거짓 양성 2(기아 CLSA · 신한 MS: 내용 칸만 실적) → '개최목적' 칸만 · 결산 기간으로 고침 |
| EXPLAIN | 충족 | 새 쿼리 다섯 0.4~4.9ms — 대기 본문 부분 인덱스 · 종목 날짜 인덱스 · `event_reaction_stats_latest` |
| 응답(실DB · 프로세스 안) | 충족 | `GetSymbolEvents` 실DB 005930 · 000660 · 000270 · 035420 · BTC — 창 · 적중 · 빗나간 결산 · 반응 게이트, 코인 `null`, 1~24ms |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| HTTP 실토큰 응답(서버 · BFF 경로) | 로컬 옛 HS 창이 닫혀(11-16) 소유자 토큰을 만들 수 없다 — 서명 키 읽기는 권한 거부. 같은 유스케이스 · 리더 · 정책을 실DB 로 프로세스 안에서 돌렸다 | 사용자 로그인 화면 QA(`QA-001`) |
| DART 본문 다시 받기 실회차 | 서버 · 뉴스 워커가 새 코드로 같이 재기동해야 한다(옛 서버 추출은 옛 사실을 안 지운다) | 머지 · `ops/salt.sh restart server news` 뒤 첫 회차 — 634건 · 하루 안 |

## 2026-11-18 F006 코치 대화 1단계 — 같은 파일

- 이 REQ 항목 변경 0 · 영역 검증 전체 통과(루트 체크리스트 `F006-coach-conversation.md`)

## 2026-11-18 — F006 대화 2단계 짝(`feat/f006-coach-conversation-s2`)

- `schema.prisma`(머리 주인)에 `CoachMessage.cardPayload` · `insightId` · `InvestmentInsight.coachMessages` 관계(주인 `DB-REQ-021`). identity 표 변경 0 — 영역 시험 전부 통과

## 2026-11-19 PC 격자 짝(`feat/f006-pc-panel-grid`, 파일만 걸침)

- `schema.prisma` 에 `PanelLayout` 모델 추가(이 REQ 표 무변경)
- 미충족: 없음(이 REQ 몫 변경 0) · 근거 루트 체크리스트 `requirements/reports/checklists/F006-pc-panel-grid.md`

## 2026-11-19 F003 v2 순서 2

- `salt-server/prisma/schema.prisma` 에 plan 모델 둘
- 미충족: 없음(이 REQ 몫 변경 0)
- 근거: 루트 체크리스트 `requirements/reports/checklists/F003-v2-s2-plan-server.md`

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

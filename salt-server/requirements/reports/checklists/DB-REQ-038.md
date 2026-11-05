# DB-REQ-038 — 체크리스트

## 2026-11-04 — 가계부 S1a · `63146ddf`

- [x] 결제 문자 원문 열 0 — 종단 테스트 `information_schema.columns` 정규식(raw · sms · message · original · text_body) 0
- [ ] `challenge` 상태 값에 실패 없음 — 표가 S1b
- [x] `landing_issued` UPDATE · DELETE 실패 — 종단 테스트(`append-only`)
- [x] 로컬 운영 DB 적용 — `svc_household` 로그인 · Flyway V1 표 4 · 임시 데이터 삭제 때 트리거 잠깐 끄고 다시 켬(`tgenabled O`)

| 미검증 · 범위 밖 | 사유 | 언제 닫히나 |
|---|---|---|
| FR-2 · 4 · 5 · 6 · 7 · 9 · 10 · 11 | 범위 밖 | 가계부 S1b |
| ~~`EXPLAIN`~~ | **닫힘 2026-11-04** — 로컬 운영 DB 트랜잭션에 행 2만(사용자 50)을 넣고 `ANALYZE` 뒤 다섯 쿼리 모두 인덱스 · 1ms 미만 · 롤백(행 0 확인) | — |

## 2026-11-04 — 가계부 S1b

- [x] V2 Flyway — 테스트 컨테이너 · 로컬 운영 DB(`svc_household`) 적용 · jOOQ 생성(`[jooq ignore]` 로 text 유일 · 부분 인덱스)
- [x] CHECK — 확인 ⇔ 지출 있음 · 예정 ⇔ 정한 시각 없음 · 답 300자 · 예산 사본 소득은 50/30/20 에서만
- [x] 원문 열 0(종단 테스트 그대로 통과) · `landing_issued` 불변(새 열 기본값으로만)
- [x] EXPLAIN — `recurring_occurrence_user_month_idx` · `expense_user_installment_idx` · `recurring_occurrence_due_idx`

### 미검증 · 범위 밖
| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| FR-2 · 5(리볼빙) · 6 · 9 · 10 · 11 | 범위 밖 | 가계부 S1c — **정정 2026-11-04** FR-6 · 11(무지출) S1c 닫힘, FR-10 · 11(챌린지) S1d 닫힘, 나머지 ~~S1d~~ ~~S1e~~ ~~S1f~~ S1g(정정 2026-11-05 — S1f 는 내 분류 · 통장 쪼개기)(정정 2026-11-04 — S1e 는 고정비 · 이상치만) — **정정 2026-11-05** S1g 는 이야기 카드만 닫았다(`MONEY-S1g-household-story-slice.md`), 사람 장부 · 리볼빙은 S1h |

## 2026-11-04 — 가계부 S1c

- [x] V3 — `expense_tag` · `calendar_sticker` · `household_setting` · 묻기 부분 인덱스 · 표 주석 `sensitive`(로컬 운영 DB 적용 `household` 2 → 3)
- [x] CHECK — 만족 1~5 · 감정 셋 · 넘김 = 시각만 · 설정 방식 ⇔ 금액 · 켜려면 금액 · 월 시간은 월급에만(도메인 거절 표와 같은 뜻)
- [x] 지출 지우기 → 태그 CASCADE(종단) · 스티커 연속 일수 열 없음
- [x] EXPLAIN(행 2만 넣고 롤백): 태그(월) `expense_user_day_idx` → `expense_tag_pkey` · 묻기 `expense_tag_ask_idx` · 스티커 · 설정 PK · 0.08ms 아래

### 미검증 · 범위 밖
| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| FR-2 · 5(리볼빙) · 9 · 10 · 챌린지 스티커 종류 · 수용 기준 2(`challenge` 실패 상태 0) | 슬라이스 범위 밖 | 가계부 S1d — **정정 2026-11-04** FR-10 · 챌린지 스티커 · 수용 기준 2 는 S1d 닫힘, FR-2 · 5 · 9 는 ~~S1e~~ ~~S1f~~ S1g(정정 2026-11-05 — S1f 는 내 분류 · 통장 쪼개기)(정정 2026-11-04 — S1e 는 고정비 · 이상치만) — **정정 2026-11-05** S1g 는 이야기 카드만 닫았다(`MONEY-S1g-household-story-slice.md`), 사람 장부 · 리볼빙은 S1h |

## 2026-11-04 — 가계부 S1d(`MONEY-S1d-household-challenge`)

- [x] V4 — `challenge`(CHECK 이름 · 기간 · 상태 둘 · 상태 ⇔ 그만둔 날) · `challenge_day`(PK) · `challenge_saving`(금액 · 메모 · 목표 ⇔ 시각)
- [x] 수용 기준 2 — 종단 테스트가 `pg_get_constraintdef` 로 `active` · `ended` 만 · `failed` · `ended` 단독 INSERT 거절
- [x] 로컬 운영 DB Flyway 적용(`household` 3 → 4) · EXPLAIN 다섯(인덱스 · 0.2ms 아래, 행 2만 넣고 롤백)

### 미검증 · 범위 밖
| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| FR-2 사용자 분류 · FR-5 리볼빙 · FR-9 사람 장부 | 슬라이스 범위 밖 | 가계부 ~~S1e~~ S1f(정정 2026-11-04 — S1e 는 고정비 · 이상치만) — **정정 2026-11-05** 통장 쪼개기 · 사용자 분류는 S1f 닫힘(`MONEY-S1f-household-categories-accounts-slice.md`), 나머지(사람 장부 · 이야기 카드 · 리볼빙)는 S1g — **정정 2026-11-05** S1g 는 이야기 카드만 닫았다(`MONEY-S1g-household-story-slice.md`), 사람 장부 · 리볼빙은 S1h |

## 2026-11-04 — 가계부 S1e(`MONEY-S1e-household-fixed-cost`)

- [x] V5 — `fixed_cost_hidden` · `fixed_cost_increase` · 표본 부분 인덱스. 종단(Testcontainers)에서 숨기기 두 번 = 행 하나 · 같은 달 증가 두 번 = 행 하나
- [x] 로컬 운영 DB Flyway 적용(`household` 4 → 5) · EXPLAIN 둘(인덱스 · 0.06ms 아래, 행 2만 넣고 롤백)

### 미검증 · 범위 밖
| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| FR-2 사용자 분류 · FR-5 리볼빙 · FR-9 사람 장부 | 슬라이스 범위 밖 | 가계부 S1f — **정정 2026-11-05** 통장 쪼개기 · 사용자 분류는 S1f 닫힘(`MONEY-S1f-household-categories-accounts-slice.md`), 나머지(사람 장부 · 이야기 카드 · 리볼빙)는 S1g — **정정 2026-11-05** S1g 는 이야기 카드만 닫았다(`MONEY-S1g-household-story-slice.md`), 사람 장부 · 리볼빙은 S1h |

## 2026-11-05 — 가계부 S1f(`MONEY-S1f-household-categories-accounts`)

- [x] V6 — `custom_category` 제약(키 꼴 · 이름 · 묶음 · 부분 유일 이름) · 방식 CHECK 둘 교체 · Flyway 5 → 6(로컬 운영 DB) · 종단 테스트가 같은 이름 409 · 마감 사본 `account_split` 을 본다
- [x] EXPLAIN(행 넣고 롤백) — 월 합 `expense_user_day_idx` 0.084ms · 분류 표 유일 키 인덱스 0.014ms

### 미검증 · 범위 밖
| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| FR-5 리볼빙 · FR-9 사람 장부 | 슬라이스 범위 밖 | 가계부 S1g — **정정 2026-11-05** S1g 는 이야기 카드만 닫았다(`MONEY-S1g-household-story-slice.md`), 사람 장부 · 리볼빙은 S1h |

## 2026-11-05 — 가계부 S1g(`MONEY-S1g-household-story`)

- [x] FR-18 — V7 인덱스 하나 · 로컬 운영 DB household 6 → 7(체크섬 일치 — 되돌려 다시 적용) · Testcontainers Flyway 7 · EXPLAIN `challenge_saving_user_day_idx` 0.124ms(행 2만 넣고 롤백)

### 미검증 · 범위 밖
| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| FR-5 리볼빙 · FR-9 사람 장부 | 슬라이스 범위 밖 | 가계부 S1h |

## 2026-11-05 — 가계부 S1h(`MONEY-S1h-household-revolving-people`)

- [x] V8 — `revolving_plan` · `person_entry` · `occasion_envelope` · 인덱스 셋 · CHECK(결제비율 · 수수료율 · 달 첫날 · 방향 · 어떤 일 · 해) · 표 주석(`sensitive` · `financial`) — 생성기가 못 읽는 키 · 표현식 CHECK · 주석은 `jooq ignore` 안
- [x] 로컬 운영 DB 적용(household 7 → 8, 한 번에 — 주석의 루트 슬라이스 경로를 문서 이름과 맞춰 둠)
- [x] EXPLAIN(2만 · 2천 행 넣고 롤백) — 넷 모두 인덱스 · 0.1ms 아래

### 미검증 · 범위 밖
| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 공제 표 | content 파라미터 | S2 content 뒤 |

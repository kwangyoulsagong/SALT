# DB-REQ-037 — 체크리스트

## 2026-11-03 — MONEY-S1a 저축 서비스 첫 판 · 저축 zone 첫 화면

| FR | 구현 | 검증 |
|---|---|---|
| FR-1 · 2 · 3 · 10 | Flyway V1(`services/savings/.../V1__baseline.sql`) | 종단 테스트(Testcontainers 실 Postgres) · 로컬 운영 DB Flyway v1 success |
| FR-3 불변 | 트리거 | 종단(UPDATE · DELETE append-only) |
| FR-11 | `savings-import.sql` · `-rollback.sql` | 일회용 Postgres 14 왕복: 가져오기(목표 2 · 거래 1 · 잔액 행 1 · KST 날짜 06-30 15:30 UTC → 07-01) → 재실행 같음 → 되돌리기 0. 로컬 운영 DB: 목표 1 · 적립 0 |

미충족: FR-4~9(S1b · 뒤). Prisma 모델 삭제는 옛 Express 삭제와 같이.

- 확인: Kotlin `./gradlew check` 56(저축 종단 10 · 경계 8 · 플랫폼 14 · 도메인 15 · 커널 9) · bootJar 로컬 운영 DB 기동 · 서버 build · lint · test 936 · test:layer-check · BFF build · test 351 · 모노레포 check-types · lint · test(core 83 · ui 43) · zone 5 운영 빌드 · 훅 사후 실행 · 실스택(BFF 4001 → Kotlin 4010 → 로컬 DB) · 실화면 3화면 × 4폭(1024 · 1280 · 1440 · 1600) 넘침 0 · 콘솔 오류 0 — 루트 `requirements/reports/checklists/MONEY-S1a-savings-calculator.md`

## 2026-11-03 — 미검증 닫기(사용자 "확인하지 못한 것은 베스트케이스")

- `2c998117`: 표 · 열 변경 0. `degraded` 구간은 행 · 이벤트 0(종단 발행 횟수 그대로 4)

## 2026-11-03 — 코드 리뷰(high) 10건 `c82be47c`

- `c82be47c` — `projection_issued` 를 화면이 읽지 않는다(채점 보관용만). 표 · 열 변경 0
- 검증: Kotlin 종단 10(대소문자 중복 400 · 목록 = 상세 구간 · exists) · 도메인 19 · 경계 8 · 플랫폼 14 · 서버 936 · BFF 351 · 모노레포 check-types · lint · test · web-savings 빌드 · 훅 사후 · 실스택(프로브 done true/false)

## 2026-11-03 — MONEY-S1a 대조 빈칸(파일에 함께 적힌 REQ)

- `b1c8ad67` — 종단 테스트가 이 REQ 를 머리에 적는다: `progressRatio` 단언 추가(저장 모양 무변경)
- 확인: 해당 영역 전체 테스트 · 빌드(루트 `requirements/reports/checklists/MONEY-S1a-savings-calculator.md`)

## 2026-11-03 — 사용자 "그것도 다 니가해": launchd 상시 · 옛 Express goals 삭제

- `d69c310e` — FR-11: public `goals` · `saving_transactions` drop 마이그레이션(DDL 주인이 Flyway 하나로). 덤프 `~/salt-backups/2026-11-03-public-goals-before-drop.dump` 복원 시험 통과. 로컬 적용은 사용자 실행
- 확인: 서버 build · lint · test 936 · test:layer-check · 재시작 health 200 · Express `/api/goals` 404 · BFF 410 · 온보딩 `set_plan` done · `ops/salt.sh status` 전부 ok

## 2026-11-03 — MONEY-S1b

- FR-5: V2 `item_unit` — Testcontainers 종단(만들기 · 상한 409 · 남의 것 404 · 지우기) · 로컬 운영 DB Flyway "Successfully applied 1 migration"(v2). 되돌리기: `DROP TABLE item_unit`(다른 표 참조 없음, 사용자 단위만 들어 있다)
- FR-6 · 7: 표 없음 — 도장 수 · 엽서 값이 적립 · 목표에서 나오는지 종단(도장 1 → 2 · 다 차면 엽서 적립 2 · 0일)
- 쿼리: 상세 `forGoal` · 상한 `countFor` 가 `user_id = ? AND goal_id = ?` — 인덱스 `(user_id, goal_id, created_at)` 앞 두 열. ~~`EXPLAIN` 은 표가 비어 Seq Scan(행 0 · 의미 없음) — 행이 쌓이면 다시 본다~~ **닫힘 2026-11-03**: 1만 8천 행을 트랜잭션에 넣고 `ANALYZE` → 상세 Index Scan 0.036ms · 상한 Index Only Scan 0.017ms · 목록 Bitmap Index Scan 0.019ms(전부 `item_unit_user_goal_idx`) → 롤백
- 2026-11-03 `4fda31db` — 종단 테스트(이 REQ 머리) 비상시 단언만 바뀜. 표 · 열 무변경. `./gradlew check` 통과
- 2026-11-03 `af797be0` — 종단 테스트 대출 단언만. 표 무변경 · `check` 통과
- 2026-11-03 `531fdf35` · `fba0e7c9` — `projection_issued.reason` text(CHECK 없음) — `not_reachable` 저장 확인(종단 · 실 스택 적립 201)
- 2026-11-03 `5640ae7f` — 테스트 카운터만. 표 무변경

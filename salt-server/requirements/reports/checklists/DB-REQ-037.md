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

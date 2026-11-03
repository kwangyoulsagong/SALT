# SRV-REQ-045 — 체크리스트

## 2026-11-03 — MONEY-S1a 저축 서비스 첫 판 · 저축 zone 첫 화면

| FR | 구현 | 검증 |
|---|---|---|
| FR-1 정정 | 옛 경로 은퇴 + 가져오기 SQL + 온보딩 프로브 → 내부 REST | 가져오기 일회용 DB 왕복(재실행 같음 · 되돌리기) · 로컬 운영 DB 1 → 1 · 프로브 실측 done true / false |
| FR-2 | `ListTemplates` 7 · 기준선 null | 종단 테스트 |
| FR-3 | `SavingsMath` · `Calculate` · `POST /calculate` | `SavingsMathSpec` 10(12M/12달 → 100만 · 올림 · 3% 세후 986,439 · 이자 162,732 · 기한 이번 달/지남 · 달성 · 34달 · 이자 있으면 빨라짐 · 100년) · 종단(400 형식 · 이율 필수 · 저장 0) |
| FR-4 | `RecordDeposits` 잠금 | 종단 — 달성 한 번 · 동시 두 건 달성 한 번 · 합계 불일치 400 · 실패 요청 흔적 0 |
| FR-5 | `ProjectionEngine` | `ProjectionSpec` 5(history_short · 분위 0.32M/1.12M → 2028-11 · 늦은 쪽 열림 · 달성) · 종단(발행 4회) |
| FR-6 | `trackReason` | 종단 |
| FR-8 · 9 | `Milestone` · `Frame` | spec · 종단 |
| FR-15 | `HomeCard` | 종단(진척 최대 · 목표 없으면 null) · BFF 테스트 · 실스택 홈 카드 |
| FR-18 | 아웃박스 3종 | 종단(같은 트랜잭션 두 행) · 로컬 실측 published_at 채워짐(브로커 전송) |
| FR-19 | 쿼리 3회 | 종단(jOOQ 실행 리스너) |
| 남의 목표 | 404(읽기 · 적립 · 나눠 넣기) | 종단 |
| 권한 | svc_savings ↔ svc_ping 서로 42501 | 종단 |

미충족 · 범위 밖은 스펙 진행 표 — S1b(FR-7 · 10~14 · 16 · 17) · `FC-REQ-024`(FR-6 사본) · 옛 Express goals 삭제(1주 관찰 뒤).

- 확인: Kotlin `./gradlew check` 56(저축 종단 10 · 경계 8 · 플랫폼 14 · 도메인 15 · 커널 9) · bootJar 로컬 운영 DB 기동 · 서버 build · lint · test 936 · test:layer-check · BFF build · test 351 · 모노레포 check-types · lint · test(core 83 · ui 43) · zone 5 운영 빌드 · 훅 사후 실행 · 실스택(BFF 4001 → Kotlin 4010 → 로컬 DB) · 실화면 3화면 × 4폭(1024 · 1280 · 1440 · 1600) 넘침 0 · 콘솔 오류 0 — 루트 `requirements/reports/checklists/MONEY-S1a-savings-calculator.md`

## 2026-11-03 — 미검증 닫기

- FR-5 `degraded`(`2c998117`): `DegradedProjectionSpec` 2(실패 주입 → plan 2027-11 · reason degraded / 실패 없으면 그대로) · 종단 `degraded:false` · 쓰기 경로는 실패 구간 발행 0
- platform launchd 상시: `ops/salt.sh up` 재시도도 권한(영속 프로세스 등록)에서 막힘 — 사용자 실행

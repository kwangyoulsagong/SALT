# DB-REQ-036 — 서비스별 스키마 · 계정 S0 검증 · 2026-11-03

| 항목 | 결과 |
|---|---|
| 서비스 계정 → 남의 스키마 SELECT | 42501 `permission denied`(svc_ping → `savings.probe`) · `public` CREATE 42501 — Testcontainers |
| 계정 스크립트 멱등 · 되돌림 | 버리는 Postgres 14(기존 `forecast` 흉내): 적용 2회 → 스키마 9 · 롤 10 · `forecast` 주인 그대로 → 되돌림 → 0 · 0 · `forecast` 남음 |
| Compose · Testcontainers | 같은 `db/roles.sql` 로 초기화 |
| 주인 표(부록 A) | 41 = `schema.prisma` 파싱 · 이중 주인 0 · 사용처 0 · 행 0 셋은 drop 후보 |
| 경계 참조(부록 B) | 10줄 — Prisma 호출 셈 · raw SQL grep · 예측 `store/*.py` grep. B9 는 FR-7 에 뷰가 없던 빈칸 → FR-7 · `FC-REQ-025` |
| 운영 DB 사전 확인 | 서버 · 예측 접속 = `postgres` 슈퍼유저 · `public` · `forecast` 주인 postgres · `public` CREATE 는 이미 PUBLIC 에 없음 — 스크립트가 지금 프로세스를 막지 않는다 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| ~~로컬 운영 DB 에 `roles.sql` 적용~~ | ~~공유 DB 변경이라 실행 권한 확인에서 막혔다~~ **적용 2026-11-03**(사용자 "너가 다해줘") — 롤 덤프 백업 뒤 `roles.sql`: 서비스 스키마 9 + `ping` · 계정 10(`svc_ping` 만 로그인) · `forecast` 주인 postgres 그대로 · `public` 42 표 그대로 · `svc_ping` 의 `public.users` 읽기 권한 오류 · 서버 · BFF 200 · Prisma 상태 일치 | 닫힘 |
| FR-4 · 6 · 8 · 9 스키마 이동 · 판정 원장 트리거 · 왕복 테스트(실 표) | 옮기는 표가 아직 없다 | S1(`savings`)부터 |
| FR-7 export 뷰 | 예측이 아직 public 을 읽는다 | S5 · `FC-REQ-025` |
| drop 후보 셋 | 덤프 · 원장 대조 절차로 따로 | S2 전 |

## 2026-11-03 — MONEY-S1a 저축 서비스 첫 판 · 저축 zone 첫 화면

- 이 REQ 에 걸린 몫(`e83f7f80`): S1 첫 표 이동 — `roles.sql` `svc_savings` 로그인(로컬 운영 DB 적용, 비밀 `LOCAL_DB_SAVINGS_PASSWORD`) · Flyway V1 savings(업무 3 + 공용 3) · 권한 테스트 표 `savings.probe` → `household.probe` · 옛 `public.goals` · `saving_transactions` 가져오기 SQL. public 원본 · Prisma 모델 삭제는 옛 Express 삭제와 같이
- 확인: Kotlin `./gradlew check` 56(저축 종단 10 · 경계 8 · 플랫폼 14 · 도메인 15 · 커널 9) · bootJar 로컬 운영 DB 기동 · 서버 build · lint · test 936 · test:layer-check · BFF build · test 351 · 모노레포 check-types · lint · test(core 83 · ui 43) · zone 5 운영 빌드 · 훅 사후 실행 · 실스택(BFF 4001 → Kotlin 4010 → 로컬 DB) · 실화면 3화면 × 4폭(1024 · 1280 · 1440 · 1600) 넘침 0 · 콘솔 오류 0 — 루트 `requirements/reports/checklists/MONEY-S1a-savings-calculator.md`

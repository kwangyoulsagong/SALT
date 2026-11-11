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

## 2026-11-04 — 가계부 S1a(`MONEY-S1-household-entry`)

- [x] `svc_household` 로 `savings.goal` SELECT → 42501(종단 테스트)
- [x] 로컬 운영 DB: `rolcanlogin t` · household 표 `expense · budget · budget_envelope · landing_issued`

## 2026-11-05 — 금융 팁 S2a(`MONEY-S2a-tips-content`)

- 몫: content 스키마가 플랫폼에서 태어나 `svc_content` 로그인을 연다(`roles.sql` · `init.sh` · Compose · 로컬 운영 DB 관리자 적용). 권한 검사 표본을 `content.probe` → `identity.probe`(content 는 Flyway 가 쓴다). Flyway V1 = 공통 세 표 + 글 · 파라미터 · 트리거 · 닫기 · 신호
- 검증: 슬라이스 검증 그대로(`requirements/reports/checklists/MONEY-S2a-tips-content.md`) — 이 REQ 의 수용 기준은 바뀌지 않았다
- 미검증: 없음(이 몫 안)

## 2026-11-06 — 서버 S2c notification(`MONEY-S2c-notification`) · `9cee4715` · `33e949e8` · `2fa68f61` · `f1a3c64c`

- 몫: notification 이동(덤프 · 복원 시험 → 가져오기 대조 1행 · 멱등 → Prisma drop) · `roles.sql` 로그인 둘 · 서비스 계정으로 남의 스키마 SELECT 권한 오류(종단)
- 미검증: 없음(이 몫 안)

## 2026-11-06 — 서버 S3a identity 셸 설정(`MONEY-S3a-identity-shell`)

- `svc_identity` 로그인(로컬 운영 DB — 이전 NOLOGIN → LOGIN) · identity 스키마 주인 = `svc_identity` · 플랫폼 기동 뒤 표 다섯 확인


## 2026-11-09 — 부록 A 보강

- `market` 행에 F016 국내 표 여덟 · `news_article_body` — 마이그레이션 `202611*` 의 `CREATE TABLE` 전부와 대조(grep)

## F017 단계 1c 수집 따라잡기 (2026-11-11, `feat/f017-s1c-collection`)

| 항목 | 상태 | 근거 |
|---|---|---|
| 이 REQ 에 닿은 변경 | 충족 | 부록 A market 행에 `market_universe_snapshot` · `price_fill_mark` · 부록 B11(예측 스냅샷 읽기 — S5 export 뷰) · `npm test` 전체 · lint · build · 레이어 훅 사후(음성 대조 exit 2) |

## F017 v2 단계 2 점검 (2026-11-11, `feat/f017-s2-checks-plain-line`)

| 항목 | 상태 | 근거 |
|---|---|---|
| 이 REQ 에 닿은 변경 | 충족 | 마이그레이션 `20261111140000_trade_check_export_and_outcome` 이 export 뷰 `public.v_trade_check_ledger_export` 를 더해 예측이 점검 원장을 뷰로 읽는다 — FR-3 직접 읽기 목록은 늘리지 않았다 · `npm run build` · `npm run lint` · `npm test` 1200 통과 · `npm run test:layer-check` · 레이어 훅 사후 실행(음성 대조 exit 2) · `prisma migrate diff` 0 |

## F017 v2 단계 4 등급 (2026-11-11, `feat/f017-s4-grade`)

| 항목 | 결과 | 근거 |
|---|---|---|
| 직접 읽기 목록(FR-3) | 늘리지 않음 | 예측은 `public.v_judgment_outcome_export` 로만 판단 원장을 읽는다(`store/judgment_tier.py`) |
| 새 표 주인 | forecast | `forecast.judgment_tier` — 서버는 뷰만 SELECT |

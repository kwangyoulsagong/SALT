# MONEY-S1a — 저축 서비스 첫 판 · 저축 zone 첫 화면 — 체크리스트

슬라이스 `requirements/specs/in-progress/MONEY-S1a-savings-calculator-slice.md` · 커밋 `e83f7f80` · `1ec3b0c6` · `3e5e0d42` · `c60f5bfb` · `8d05a006` · `b1c8ad67`

## 1. 수용 기준

| REQ | 결과 | 근거 |
|---|---|---|
| `SRV-REQ-045` | 4/4 | 계산 경계 10 · `trackReason` · 서버 문장 0 · 옛 경로 은퇴(정정) |
| `DB-REQ-037` | 3/3 | 가져오기 대조 · 불변 트리거 테스트 · `legacy_category` 왕복 |
| `BFF-REQ-047` | ~~1/2~~ **2/2**(2026-11-03 `2c998117`) | 가공 0 테스트 · 구간 실패 → `degraded` + 계획값 |
| `FE-REQ-056` | 4/4 | 계산 0 grep(`b1c8ad67`) · 금지어 0 · 모션 0 · 회귀 0(계좌 칸은 정책상 뺌) |

## 2. 검증 — 실행한 것

| 무엇 | 결과 |
|---|---|
| Kotlin `./gradlew check` | 통과 56(저축 종단 10 · 경계 8 · 플랫폼 14 · 도메인 15 · 커널 9) — 쿼리 3회 · 동시 적립 달성 1회 · 권한 42501 양방향 포함 |
| 실행 jar | `bootJar` → 로컬 운영 DB(svc_savings) Flyway v1 · `/actuator/health` UP · 아웃박스 → RabbitMQ published |
| 가져오기 | 일회용 Postgres 14 왕복(재실행 같음 · KST 날짜 · 잔액 행 · 되돌리기) · 로컬 운영 DB 목표 1 · 적립 0 |
| 서버 Express | build · lint · test 936 · test:layer-check 16 |
| BFF | build · test 351(+3) |
| 프론트 | check-types · lint · test(core 83 · ui 43) · zone 5 운영 빌드 · test:layer-check 26 · 훅 사후 실행(Bash 로 쓴 파일 전부) |
| 실스택 | BFF 4011 → 라우팅 표 → Kotlin 4010 → 로컬 DB: 템플릿 · 계산(3% 세후 986,439원) · 만들기 · 적립 · 목록 · 나눠 넣기 400 · 옛 `/api/goals` 410 · 홈 카드 "제주 여행 25.0%". BFF 4001 재시작 뒤 200 |
| 온보딩 프로브 | Express 재시작 뒤 가져온 목표 주인 `set_plan` done true · 목표 없는 사용자 false |
| 실화면(임시 사용자, 뒤에 삭제) | 3003 `/goals` · `/goals/new` · 상세 — 만들기 → 상세 → 적립 · 1024 · 1280 · 1440 · 1600 가로 넘침 0 · 콘솔 오류 0 · `<main>` 중첩 발견 → 고침 |
| 금지어 · 계산 grep | 0 · 0 |
| 임시 데이터 | 목표 · 적립 · 발행(트리거 잠시 끔) · 아웃박스 삭제 → 가져온 1건만 남음 · 트리거 다시 켬 |

## 3. 걸린 기존 REQ(주인 집계)

`BFF-REQ-007` · `025` · `045` · `046` · `DB-REQ-036` · `FE-REQ-007` · `009` · `010` · `013` · `035` · `052` · `054` · `055` · `OPS-002` · `SRV-REQ-008` · `043` · `044` — 각 스펙 Changelog · 체크리스트 · 회고에 한 줄.
짝 영역 변경 없음: 예측(`FC-REQ-024` — 채점은 S1b 뒤, 이벤트 계약만 생김) · RN(`RN-REQ-033`).

## 4. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| platform launchd 상시 | 등록이 권한에서 막힘(재시도 `ops/salt.sh up` 도 "영속 프로세스 등록" 거부) — 지금은 세션 프로세스 | 사용자 `ops/salt.sh up` |
| ~~앱 웹뷰 390 · 셸 3000 경유~~ | **닫힘 2026-11-03** — 셸을 3010 에 띄워 경유 · 웹뷰 390 · 일반 390 실측(`FE-REQ-056` 체크리스트) · 결함 1 `b0768194` | — |
| ~~`BFF-REQ-047` `degraded`~~ | **닫힘 2026-11-03** `2c998117` | — |
| `FE-REQ-056` FR-13 서버 렌더 | 토큰이 브라우저 저장소 | `FE-REQ-013` |
| 옛 Express goals · Prisma 모델 · `RETIRED_PATHS` 삭제 | 1주 잔여 호출 관찰 | 2026-11-10 이후 |
| 독립 코드 리뷰(high) | done 전에 브랜치 전체로 | S1b 끝 |

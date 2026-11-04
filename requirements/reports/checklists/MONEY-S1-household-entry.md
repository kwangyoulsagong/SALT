# MONEY-S1 가계부 — household 서비스 첫 판 · 가계부 zone 첫 화면 — 체크리스트

슬라이스 `requirements/specs/in-progress/MONEY-S1-household-entry-slice.md` · 커밋 `a16356f6` · `63146ddf` · `b162ac6f` · `df45ae7d` · `2d4db66c` · `2177074c` · `bfb337b7`

## 1. 수용 기준

| REQ | 결과 | 근거 |
|---|---|---|
| `SRV-REQ-046` | 3/4 | 원문 0(출력 캡처 · 로그 grep) · 경고/차단 필드 0 · 문자 표본 파싱 9 · 백테스트는 표본 없음 |
| `DB-REQ-038` | 2/3 | 원문 열 0 · `landing_issued` 불변 · `challenge` 는 S1b |
| `BFF-REQ-048` | 2/2 | parse 본문 로그 0 · 목표 시계 300ms → pending |
| `FE-REQ-057` | 4/4 | 3탭 실측 · 경고 색/팝업 0 · 원문 저장소/로그 0 · 연속/실패 표시 0 |

## 2. 검증 — 실행한 것

| 무엇 | 결과 |
|---|---|
| Kotlin `./gradlew check` | 통과(가계부 도메인 19 · 종단 11 포함, Modulith · ArchUnit 0) — 리뷰 반영 뒤 다시 |
| 실행 jar | `bootJar` → 로컬 운영 DB(`svc_household` 로그인 — ALTER ROLE 적용) Flyway V1 · health UP |
| BFF | `npm run build` · `npm test` 360 |
| 프론트 | check-types · lint · test(core 169) · zone 5 운영 빌드 · `test:layer-check` 26 · 훅 사후 실행 차단 0 |
| 실스택(임시 사용자 — 뒤에 삭제) | BFF 4001 → 라우팅 표 → Kotlin 4010: 예산 · 저장(봉투 −3,000) · 파싱 · 깨진 JSON 400 · 홈 카드 셋 · `1만2000`=12,000 |
| 실화면 | 셸 3000 경유 `/household` · `/new` · `/budget` · `/month/[ym]` — 4폭 + 웹뷰 390 넘침 0 · 3탭 입력 · 붙여넣기(원문 즉시 비움 · 저장소 0) · 50/30/20 · 목표 시계(성공 · pending 재시도 성공/실패 route 실측) · 404 |
| 로그 | platform · BFF 로그에 카드번호 · 가맹점 · 이름 조각 0 |
| 임시 데이터 | 가계부 행 · 발행(트리거 잠깐 끔) · 아웃박스 · 저축 목표/발행 삭제 → 기존 가져온 목표 1건만 · 트리거 다시 켬 |

## 3. 걸린 기존 REQ(주인 집계)

`SRV-REQ-043` · `044` · `045` · `DB-REQ-036` · `BFF-REQ-045` · `046` · `047` · `FE-REQ-009` · `010` · `013` · `035` · `052` · `054` · `055` · `056` · `OPS-002` — 각 스펙 Changelog · 체크리스트 · 회고에 한 줄.
짝 영역 변경 없음: 예측(`FC-REQ-024` — `LandingIssued` 계약만) · RN(`RN-REQ-034`). 규칙: `msa-services.md` §2 household 행 · `layered-architecture.md` §4 · `fsd-features.md` · `fsd-pages.md`.

## 4. 코드 리뷰(high) — 1회만

10건 중 실제 오동작 6건 반영(`2177074c` · `bfb337b7`): 착지 발행 시점 편향 · 말일 한 점 · 표본 시작(지난날 대략 합계) · `1만2000`/`1,200만` · 소수 원 · goal-clock 넘침 500 · "계산 중" 멈춤 · 슬라이스 이름 규칙.
고치지 않고 기록: 지우기 이벤트 없음(구독자 S1b) · 그날 이미 발행해도 착지 재계산(쿼리 2) · BFF 시간 상한 두 벌. **재리뷰 하지 않음** — 사용자 "미디움 하드는 절대 통과 못한다 · 전 작업에서 오히려 독"(2026-11-04).

## 5. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 착지 백테스트(3개월) | 실사용 기록이 없다 | 발행 3개월 뒤 · `FC-REQ-024` |
| 반복 · 마감 · 할부 띠 · 공제 · 고정비 · 감정 · 사람 장부 · 재미 · 통장 쪼개기 · LLM 분류 | 슬라이스 범위 밖 | 가계부 S1b |
| 저축 구독(`ExpenseRecorded` · `MonthClosed`) · 지우기 이벤트 | 구독자가 없다 | 가계부 S1b |
| 소유자 실계정 사람 눈 확인 | 임시 사용자로 실스택 · 실화면은 끝 | `QA-001` |
| RN 가계부 | 웹 계약 뒤 | `RN-REQ-034` |

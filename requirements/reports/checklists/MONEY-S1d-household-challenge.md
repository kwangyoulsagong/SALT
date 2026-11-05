# 체크리스트 — 가계부 S1d + F4d(내가 고르는 챌린지 · 한 날 · 아낀 돈 · 저축 목표에 보태기)

슬라이스 `requirements/specs/done/MONEY-S1d-household-challenge-slice.md` · 커밋 `8d0e2723`(서버 · DB) · `22b71577`(BFF) · `23d44bb6`(FE) · `7eb8004d`(낡은 주석 "S1d" → S1e — 뒤 가계부 인프라 컴파일 통과).
영역 체크리스트: `salt-server/…/SRV-REQ-046.md` · `DB-REQ-038.md` · `SRV-REQ-045.md` · `DB-REQ-037.md` · `bff/…/BFF-REQ-048.md` · `salt-microFe/…/FE-REQ-057.md` · `FE-REQ-056.md` · `FE-REQ-009.md` · `FE-REQ-010.md` · `FE-REQ-013.md`.

## 1. 판단 1~7 → 구현

| 판단 | 확인 |
|---|---|
| 1 챌린지 하나 | 새 표 셋(챌린지 · 한 날 · 아낀 돈) + 저축 열 하나(`source_ref`). 지출 원장 변경 0 |
| 2 실패 없음 | DB CHECK `status IN ('active','ended')` · 상태 ⇔ 그만둔 날 짝(종단 — `failed` · `ended` 단독 INSERT 거절) · 도메인 단계 표 · 종단 — 응답 data 에 `fail` · `success` · `streak` · `consecutive` · `rate` 0 · 그만두기 두 번 같은 날 · 거절 표(이름 · 시작 · 기간 넘침 · 앞뒤) · 상한 5(끝난 것 안 셈) |
| 3 한 날 | 도메인 — 받는 날 표(기간 · 오늘 · 그만둔 날 · 끝난 뒤 지난 날) · 달력 — 쓴 날에도 붙음 · 미래 안 붙음 · 개수만 · 종단 — 두 번 눌러도 하나 · 미래 · 기간 밖 400 · 월 화면 `challenge` · `challengeDays` |
| 4 보태기 | 종단 — 저축 적립 `source=saved_by_challenge` · 같은 아낀 돈 두 번 → 행 1 · 다른 목표 · 다른 사용자 409 `DEPOSIT_SOURCE_USED` · 가계부 보탰다 재시도 200 · 다른 목표 409 · 보탠 것 지우기 409 · BFF — 순서(가계부 읽기 → 저축 → 가계부) · 본문 금액 무시 · 저축 거절이면 가계부 안 부름 · 빈 목표 400(서비스 호출 0) |
| 5 날짜는 서버 | 목록 `today` · `startMax` · `todayMarkable`. 화면 날짜 칸 min · max 는 그 값 그대로(더하기 0) |
| 6 잠그지 않음 | 상한 경합 · 보탰다 경합 — 슬라이스에 이유 기록 |
| 7 쿼리 수 | 종단 — 월 17(+1) · 저장 11/10 · 홈 6 그대로 |

## 2. 검증

| 항목 | 결과 |
|---|---|
| Kotlin | `./gradlew check` 통과(테스트 147) · 가계부 도메인 44(+7 `ChallengeSpec`) · 가계부 종단 24(+3) |
| 실행 jar | `bootJar` → 로컬 운영 DB Flyway 적용(`household` 3 → 4 · `savings` 2 → 3) · health UP · Swagger 새 경로 7(`/v3/api-docs`) |
| BFF | `npm run build` · 전체 365/365(+2) |
| FE | `check-types` · `lint` 12/12 · `test`(Node 22 — core 169 · ui 44) · `test:layer-check` 26 · 가계부 · 저축 zone 운영 빌드 · 훅 사후 실행 38파일 차단 0 |
| 번들 | `/household/challenges` 153 kB(새) · `/household` 160 → 161 kB · `/goals/[id]` 154 kB · 공용 102 kB |
| 실스택 · 실화면 | 임시 사용자 둘(뒤에 삭제 — 챌린지 4 · 한 날 3 · 아낀 돈 4 · 목표 2 · 적립 3 · 발행 5 · 아웃박스 2 → 0, 트리거 다시 켬): 예시 → 이름 칸 · 기간 → 시작 · 오늘 했어요(눌림) · 아낀 돈 4,500원 · 여행에 보태기 → "여행에 보탰어요" · 그만두기 → "끝난 챌린지" · 가계부 달력 "챌린지 한 날 1일" + 동그라미 · 저축 목표 상세 "챌린지로 아낀 돈 4,500원" · 4폭(1024 · 1280 · 1440 · 1600) × 2화면 넘침 0 · 앱 웹뷰 390 넘침 0 |
| 화면 읽기 | 카드 `ariaSnapshot` — 제목 · 단계 · 기간 · "한 날 1일 아낀 돈 4,500원 목표에 보탠 돈 4,500원" · "오늘 했어요 [pressed]" · 목록 항목 "11월 4일 4,500원 · 아메리카노 여행에 보탰어요" · 달력 칸 이름 "11월 4일 기록 없음 · 챌린지 한 날 — 안 쓴 날로 표시" |
| 로딩 · 실패(Playwright route) | 목록 500 → "불러오지 못했어요" · 3초 지연 → 스켈레톤 → 폼 · 목표 null → 보태기 칸만 "지금은 저축 목표를 불러오지 못했어요" · 보태기 409 → "저장 못 했어요. 다시 눌러 주세요"(다시 누를 수 있음) · 시작 400 `CHALLENGE_PERIOD_TOO_LONG` → "기간은 92일까지예요" · 입력 남음 |
| 콘솔 | `POST /api/session` 404 — 셸(3000)이 꺼진 로컬 구성에서 zone 화면마다 나는 것(이 슬라이스와 무관). 첫 실행에 400 둘 — 같은 흐름 두 번(임시 사용자 둘) · 응답 기록에서 재현 0 |
| EXPLAIN | 목록 · 열린 수 · 날 · 아낀 돈 · 달력 한 날 전부 인덱스(`challenge_user_idx` · `challenge_day_pkey` · `challenge_day_user_idx` · `challenge_saving_challenge_idx`) · 0.2ms 아래(행 2만 넣고 롤백). 출처 조회는 `deposit_user_idx`(+ 유일 `deposit_source_ref_key`) |
| `node scripts/check-done.mjs` | 통과 |

## 3. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 사람 장부 · 이야기 카드 · 고정비 · 리볼빙 · 통장 쪼개기 · 사용자 분류 | 범위 밖(판단 1) | 가계부 S1e — **정정 2026-11-04** 고정비 · 이상치(`FixedCostIncreased`)는 S1e 닫힘(`MONEY-S1e-household-fixed-cost-slice.md`), 나머지는 S1f — **정정 2026-11-05** 통장 쪼개기 · 사용자 분류는 S1f 닫힘(`MONEY-S1f-household-categories-accounts-slice.md`), 나머지(사람 장부 · 이야기 카드 · 리볼빙)는 S1g — **정정 2026-11-05** S1g 는 이야기 카드만 닫았다(`MONEY-S1g-household-story-slice.md`), 사람 장부 · 리볼빙은 S1h |
| 공제 계기판 | content 파라미터 | S2 content 뒤 |
| 저축 장면 · 도장에서 아낀 돈 따로 보기 | 지금은 적립 줄 표시만 | 저축 S2 |
| RN 챌린지 화면 | 웹 계약 확정 뒤 | `RN-REQ-034` |

## 4. 2026-11-04 — 확인 단계(사용자 "파이프라인 검증 버그 검증 done 누락 없는지 다 확인한거야?")

| 무엇 | 결과 |
|---|---|
| 기계 대조 | REQ × 커밋 11쌍 전부 스펙 Changelog 에 해시 · 주인 REQ 11개 체크리스트 · 회고 22/22 · `check-done.mjs` 통과 · Swagger 새 경로 7 |
| 낡은 문장 | `BFF-REQ-048` S1a 표 "챌린지는 S1b" 정정 · 마스터 인덱스 `SRV-REQ-045` 행에 챌린지 적립 경로 |
| 코드 다시 읽기 | 결함 1 — 챌린지 카드 실패 줄이 다음 동작 성공 뒤에도 남음 → `dc476f8d`. route(한 날 500 → 적기 성공)로 고치기 전 남음 · 고친 뒤 빈 줄 확인 |
| 다시 돈 것 | 프론트 타입 · lint · 레이어 검사 · 가계부 zone 빌드(`/household/challenges` 153 kB) · 훅 사후 실행 · 확인용 임시 사용자 삭제(0) |

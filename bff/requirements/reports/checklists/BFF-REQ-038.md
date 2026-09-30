# BFF-REQ-038 거래 기록 · 계획 · 사이즈 · 리스크 예산 — 체크리스트 (2026-09-24)

| FR | 구현 | 확인 |
|---|---|---|
| FR-1 사이즈 계산 | `trade-risk.controller.ts` `sizeCheck` · `app-trade-risk.service.ts` · `trade-risk.viewmodel.ts` `toSizeCheckViewModel` | 테스트 5 — 숫자 그대로 · 깨진 숫자 `null` · 모르는 사유 버림 · `orderExecution !== false` 거부 · 켈리 부분 값 `null`. 5xx → `unavailable` · 4xx 그대로 · 재시도 0회 |
| FR-2 리스크 예산 | `riskBudget` · `updateRiskBudget` · `toRiskBudgetViewModel` | 테스트 2 — 게이지 3 · 모르는 상태 → `insufficient_data` |
| FR-3 계획 | `listPlans` · `createPlan` · `updatePlan` · `toTradePlanList` | 테스트 2 — 깨진 행만 빠짐 · 서버 `{ plans }` 풀기 |
| FR-4 거래 + 계획 | `recordTrade` | 테스트 4 — 거래 → 계획(거래 id) 순서 · 계획 없으면 1회 · 계획 실패는 거래 유지 + `unavailable` · 거래 실패 400 은 그대로 · 계획 안 만듦 |
| FR-5 Decimal 문자열 | `toRecordedTransaction` | 테스트 1 |
| FR-6 매입가 숨김 | `app-ai-coach.service.ts` 프로필 GET · PATCH | 코드 확인(테스트 없음 — 기존 프로필 매핑과 같은 한 줄) |

| 확인 | 결과 |
|---|---|
| 테스트 | `npm test` **137 pass / 0 fail**(+14) |
| 빌드 | `npm run build`(tsc) exit 0 |
| HTTP | 실행 중 BFF(watch)에서 새 경로 7개 — 토큰 없음 400 "No token provided" · 가짜 토큰 "Invalid token"(서버 인증까지 도달) · 없는 경로 "Route not found" |
| 화면 연동 | Playwright 로 BFF 응답을 고정해 웹이 이 뷰모델을 그대로 그리는 것 확인(`FE-REQ-039` 체크리스트) |

| 미검증 · 범위 밖 | 사유 | 언제 닫히나 |
|---|---|---|
| 실 토큰으로 서버까지 200 본문(사이즈 · 게이지 · 거래 + 계획) | 로컬 토큰 발급 불가(자동 모드) — 슬라이스 1 · 2 와 같은 사유 | `QA-001` 로그인 QA(사용자) |
| p95(사이즈 계산 < 200ms 서버 + BFF 20ms) | 실 토큰 없음 | `QA-001` 로그인 QA |
| 미러 · 월간 복기 경로 | 슬라이스 4 · 6 | 미러는 슬라이스 5 에서 닫힘(아래) · 복기는 슬라이스 6 |
| ESLint | BFF 에 설정이 없다(기존) | 범위 밖 |

---

# 슬라이스 5 — 미러 · 결과 · 태그 확정 · 입력 중 미리보기 (2026-09-27)

| FR | 구현 | 확인 |
|---|---|---|
| FR-7 미러 | `behavior-mirror.controller.ts` `mirror` · `app-behavior-mirror.service.ts` `getMirror` · `behavior-mirror.viewmodel.ts` `toBehaviorMirrorViewModel` | 테스트 — 숫자 그대로 · `truncated` → `historyStatus` · 값 `null` + `ok` → `insufficient_data` · 모르는 상태 → `insufficient_data` · 모르는 준수 라벨 0 · 기준선 필드 하나라도 빠지면 기준선 `null` · 5xx/계약 깨짐 → `unavailable` · 4xx 그대로 |
| FR-8 결과 · 태그 확정 | `listOutcomes` · `confirmOutcomeTags` · `toDecisionOutcomeList` | 테스트 — 깨진 행만 빠짐 · 계약에 없는 필드(`quantity` · `feesKrw` · `planId`) 안 옮김 · limit 400 · uuid 400 · 태그 모양 400 · 확정 실패 그대로 |
| FR-9 size-check `behavior` | `trade-risk.viewmodel.ts` `toSizeCheckViewModel` · `SIZE_CHECK_KEYS` 에 `hasPlan` | 테스트 — `edgeWarnings` 는 `noEdge` 만 · `sellFraming` 에서 `planId` 버림 · `null` · `truncated` · 깨진 모양 → `behavior: null` 이고 사이즈 결과 그대로 |

| 확인 | 결과 |
|---|---|
| 테스트 | `npm test` **152 pass / 0 fail**(슬라이스 3 기록 137 → +15, 새 파일 `app-behavior-mirror.test.ts`) |
| 빌드 | `npm run build`(tsc) exit 0 |
| 화면 연동 | Playwright 로 이 뷰모델 모양을 고정해 웹이 그대로 그리는 것 확인(`FE-REQ-039` 체크리스트 §슬라이스 5) |

| 미검증 · 범위 밖 | 사유 | 언제 닫히나 |
|---|---|---|
| 실 토큰으로 서버까지 200 본문(미러 · 결과 · 태그 확정 · size-check `behavior`) | 로컬 토큰 발급 불가 — 슬라이스 1~4 와 같은 사유. 서버 쪽은 유스케이스 · 응답 변환 함수로 확인 | `QA-001` 로그인 QA(사용자) |
| 실행 중 BFF 에 새 경로 HTTP 실측 | 떠 있는 BFF(:4001)가 이 브랜치 코드가 아니다 — 재기동하지 않았다 | 브랜치 머지 뒤 로컬 재기동 · `QA-001` 로그인 QA |
| 월간 복기 경로 | 슬라이스 6 | FR-7 나머지 |
| ESLint | BFF 에 설정이 없다(기존) | 범위 밖 |

---

# 슬라이스 6 — 월간 복기 · Brier · 체크리스트 · 시나리오 · 한 종목 상한 (2026-09-27)

| 확인 | 결과 |
|---|---|
| 복기 뷰모델 | 서버 숫자 · 문장 그대로 · 달 목록에서 형식 아닌 값 제외 · 깨진 Brier 사례 제외 · 값 없는 `ok` 지표 → `insufficient_data` · 모르는 IPS 상태 → `insufficient_data` · 문자열 숫자를 0 으로 읽지 않음 · `ok` 인데 본문 없음 · 13월 → 계약 깨짐 |
| 복기 서비스 | 달 쿼리 전달(`?month=2026-07`) · `no_ledger` 그대로 · 503 → `unavailable` · 400 그대로 |
| 미러 · 미리보기 | `brier` 없으면 `null`(미러 그대로) · 체크리스트 빈 질문 줄 제외 · 프리모템 없으면 체크리스트 `null` |
| 리스크 예산 | 금액 빈 충격 줄 제외 · `ok` 인데 손실 없는 구간 → `insufficient_data` · 모르는 상태 → 시나리오 `null` · `maxSingleAssetWeight` · PUT 키 통과 |
| 거래 + 계획 | 프리모템 답만 있어도 계획 생성(공백 정리) + 체크리스트 전달 · **체크리스트만으로는 계획 없음**(서버 1회) |
| 전체 | `npm test` **163 / 0**(+11) · `npm run build`(tsc) |
| 계약 | `@repo/core/coach` `monthlyReview.ts` 신설 · `tradeRisk.ts`(설정 · 시나리오 · PUT · 계획 체크리스트 · 기록 요청) · `behaviorMirror.ts`(Brier · 체크리스트) — 뷰모델 파일과 같은 모양 |

## 미검증 · 범위 밖 (슬라이스 6)

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 떠 있는 BFF · 서버로 새 경로 HTTP | 실행 중 프로세스가 이 브랜치 코드가 아니다 · 로컬 토큰 없음 | 머지 뒤 재기동 · `QA-001` 로그인 QA |
| 복기 첫 조회 지연(서버가 그 자리에서 만들 때) | 실 DB 유스케이스 31ms 라 1,500ms 상한 안이라고 봤다. HTTP 로 재지 않았다 | `QA-001` 로그인 QA |

---

# 슬라이스 7 — 미러 연승 · 연패 · 진입 시간대 · 요일 (2026-09-27)

| 확인 | 결과 |
|---|---|
| 연승 · 연패 뷰모델 | 서버 값 그대로 · `basis` 는 옮기지 않음 · 모르는 연속 종류 → `current: null` · 비율 값 `null` 이면 `observed: false` · 뼈대가 깨지면 `streak: null` |
| 시간대 · 요일 뷰모델 | 고정 순서(새벽 → 저녁 · 월 → 일) · 빠진 칸은 0건 · `insufficient_data` · 서버 `bands: null` → 섹션 없음 |
| 미러 | 새 두 블록이 실린다 · 서버가 아직 주지 않으면 `null` — 미러 전체는 `ok` 그대로 |
| 전체 | `npm test` **167 / 0**(+4) · `npm run build`(tsc) |
| 계약 | `@repo/core/coach` `behaviorMirror.ts`(`StreakView` · `TradeTimingView`) — 뷰모델 파일과 같은 모양 |

## 미검증 · 범위 밖 (슬라이스 7)

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 떠 있는 BFF · 서버로 새 필드 HTTP | 실행 중 프로세스가 이 브랜치 코드가 아니다 · 로컬 토큰 없음 | 머지 뒤 재기동 · `QA-001` 로그인 QA |
| ESLint | BFF 에 설정이 없다(기존) | 범위 밖 |

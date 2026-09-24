# BFF-REQ-024 (F004 API) — 검증 체크리스트

- REQ: `bff/requirements/specs/in-progress/BFF-REQ-024-F004-API.md`
- 브랜치: `feat/f004-bff-judgment` (base `main` `ebadcf9`) · 검증일: 2026-09-22
- 상태: **부분 완료** — 종목 판단 경로(`/api/app/ai-coach/detail`)만 닫혔다. 코치 리포트 · 성적표 · 재생성 · 해설 인증은 미착수
- **전 영역 통합 기록**: 루트 `requirements/reports/checklists/F004-bff-symbol-judgment.md`

## 1. 종목 판단 뷰모델 (FR-30~38)

| FR | 판정 | 위치 · 근거 |
|---|---|---|
| FR-30 `packages/core` 공유 | pass (2026-09-22, FE 패널 슬라이스) | `salt-microFe/packages/core/src/coach/symbolCoach.ts` (`@repo/core/coach`). **BFF 는 workspace 밖이라 사본이다** — 원본은 `symbol-coach.viewmodel.ts` 타입 절, 바꿀 때 둘 다 |
| FR-31 `renderable` 판별 union | pass | `ModeCoachViewModel` — `false` 분기에 `judgment` · `trackRecord` 없음 |
| FR-32 `confidence` 타입에 없음 | pass | |
| FR-33 `zone` 항상 · `notPrediction: true` | pass | zone 없으면 그 모드를 `null` 로 막는다 |
| FR-34 `validity.code` 코드 | pass | |
| FR-35 목표가 필드 없음 | pass | |
| FR-36 관심 종목 판단 필드 0건 | pass | |
| FR-37 해설 응답 union | 미착수 | |
| FR-38 preflight `maxLossOfTotalRate` | 미착수 | |

**REQ 와 다르게 한 것**
- 모드 계약이 깨지면 그 모드가 `null` 이다 — 타입이 `ModeCoachViewModel | null` 이고 `degradedFields` 에 `modes.scalp` · `modes.longTerm` 이 들어간다
- `riskGuard` 는 `{ hasHolding, holdingWeightLimit }` 두 필드로 REQ 와 같고, 기존 응답의 보유 금액은 뺐다
- 뉴스 항목에 REQ 모양에 없는 `url` 을 남겼다
- `assetType` 이 없다 — 서버가 아직 주지 않는다

## 2. 나머지 계약 (FR-1~17)

| FR | 판정 | 비고 |
|---|---|---|
| FR-1~12 `CoachDetailViewModel` | 미착수 | `/coach/report` 경로가 없다 |
| FR-13 뷰모델 `packages/core` | pass | FR-30 과 같다 |
| FR-14 기존 경로 필드 추가만 | **다르게** | `/ai-coach/detail` 은 `header` · `decisionCards` → `modes` 로 바꿨다(BREAKING). 소비처 0건 · `preview` 는 `badge` 가 `null` 가능 외 무변경 |
| FR-15 · FR-16 · FR-17 | 미착수 | |

## 3. F009 슬라이스 0 — C04 (FR-39, 2026-09-24)

| FR | 판정 | 근거 |
|---|---|---|
| FR-39 `worstObservedReturn` | **pass** | `symbol-coach.viewmodel` · `coach-report.viewmodel` · `app-signal-performance.service` · 테스트 2. 옛 이름 별칭 없음 |
| 게이트 | **pass** | `npm run build` · `npm test` **121 pass / 0 fail** |

### 미검증

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 인증된 HTTP 응답 실측(서버 · BFF 경유) | 로컬 서버 · BFF 는 떠 있지만 이번 세션에서 로그인 토큰을 만들 수 없었다. 도메인 · 뷰모델 단위 테스트로만 확인 | 사용자가 로그인한 화면에서 코치 카드 확인 시 |
| 실제 MDD(시간순 자산 곡선) | 이번엔 이름만 바로잡았다. 판단 표본은 서로 겹치는 기간이라 한 곡선으로 이을 수 없다 | F009 슬라이스 1 `DecisionOutcome` — 사용자 거래로 곡선이 생길 때 |

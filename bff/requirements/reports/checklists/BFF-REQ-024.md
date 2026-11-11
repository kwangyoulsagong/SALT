# BFF-REQ-024 (F004 API) — 검증 체크리스트

- REQ: `bff/requirements/specs/in-progress/BFF-REQ-024-F004-API.md`
- 브랜치: `feat/f004-bff-judgment` (base `main` `ebadcf9`) · 검증일: 2026-09-22
- 상태: **부분 완료** — 종목 판단 경로(`/api/app/ai-coach/detail`)만 닫혔다. 코치 리포트 · 성적표 · 재생성 · 해설 인증은 미착수
> **2026-10-29 전수 조사:** 위 상태 줄은 작성 당시 — 이후 닫힌 절(B · C절 10-27 · 10-28, 코치 리포트 · 재생성 · 해설 인증 슬라이스 5 · 14)은 본문 표가 진실
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

## 4. F009 슬라이스 0 — C05 (2026-09-24)

코드 변경 없음(통과 전달). 테스트 픽스처 `scalp_24h` · `npm run build` · `npm test` **121 / 0**.

## F010 슬라이스 0 — FR-40 (2026-09-28)

| 확인 | 결과 |
|---|---|
| 단위 | `npm test` 174 / 0(+1: `insufficient_sample` 은 정상 사유 · 모르는 사유는 계약 깨짐) · `tsc` |
| 통과 필드 | `signalTrackRecord.{horizonHours, alwaysUpRate, excessWinRate}` 없으면 `null` · `samples` 서버 모양 그대로 |
| 미검증 | 떠 있는 BFF 가 이 브랜치가 아님 — 실 경로는 머지 뒤 |

## 2026-10-29 REQ 전수 조사

- generate 경로 · scoreboard 039 표시

## 2026-10-29 F004 슬라이스 16 — 웹 주문 전 체크가 `trade-preflight` 첫 소비 · 서버 FR-65 필드 통과

- BFF 코드 변경 없음. `app-trade-preflight.service` 가 `calculation` 을 통째로 넘겨 서버 새 필드 `targetGainAmount` · `targetGainRate` 가 그대로 지나간다
- 실 BFF(4001) 응답 확인: 목표 1.2억 → `36449` · `0.1215` / 1억 → `-19626` / 목표 없음 → `null`. 계약 타입은 `@repo/core/coach` `TradePreflightView`(웹 소유 사본)
- BFF build · test 는 코드 무변경이라 돌리지 않음
- 미검증: 없음

## 2026-10-29 `trade-preflight` `assetType` 전달 (SRV-REQ-025 FR-66)

- `app-trade-preflight.service.ts` 한 줄. 재시작한 BFF(4001)에서 005930 → `kr_stock` · BTC → `crypto` 확인
- `npm run build` · `npm test` 288 통과
- 미검증: 없음

## 2026-10-30 — F004 슬라이스 18 설정 화면

- F004 슬라이스 18 — **변경 없음.** `GET/PATCH /api/app/ai-coach/profile` 이 6필드 + 숨김을 이미 그대로 넘긴다. 웹 설정 화면이 그중 `defaultMode` · `panicSellWindowHours` 를 새로 읽는다
- 미검증 · 범위 밖: 없음

## 2026-11-02 — MONEY-F1(`FE-REQ-053`) 투자 zone 분리 · 홈 카드

- MONEY-F1(`FE-REQ-053`) 에서 이 REQ 가 걸렸다 — shared 레이어 → `@repo/web-shared`(import 경로 치환)(`20971abf`) · 투자 화면 `apps/web/src` → `packages/domain-invest/src`(내용 무변경) · 투자 zone 조립(`b00b0cea`). 파일 2개(경로 이동 내용 무변경 1 · 수정 1 · 추가 0 · 삭제 0). 계약 · 동작 무변경
- 확인: 모노레포 check-types · lint · test · zone 5 빌드 · layer-check · 훅 사후 실행(바뀐 TS 전부) · 실화면 — `salt-microFe/requirements/reports/checklists/FE-REQ-053.md` §2


## 2026-11-05 — FE-REQ-013 FR-80 2단계 쿠키 세션

- 파일만 걸침 — `packages/domain-invest/src/features/run-preflight/api/runPreflightApi.ts`(이 REQ 가 머리 주석 주인)에서 토큰 헤더(`authHeader()`)를 뺐다 · 로그인 여부 `useHasSession`. 토큰은 httpOnly 쿠키 · 같은 origin 이라 브라우저가 싣는다(`721063fc`). 화면 · 동작 무변경
- 확인: check-types · lint · test · zone 4 빌드 · 훅 사후 실행 · 실스택 — `salt-microFe/requirements/reports/checklists/FE-REQ-013.md` 2026-11-05


## F017 v2 단계 1 — 판단 막지 않음 (2026-11-10, `feat/f017-s1a-judgment-caveats`)

| 항목 | 결과 | 근거 |
|---|---|---|
| FR-31 뒤집힘 — 판단 늘 · `observations` · `caveats` · 모르는 사유 `unknown` | 충족 | `npm test` 443/443 · `npm run build` |

| 미충족 · 미검증 | 사유 | 언제 닫히나 |
|---|---|---|
| 3종 결함 ~~160~~ → **6**(1b 2026-11-10 — 코인 · 국내 단타 과거 검산 `signal-skill@1` `f38ca6ae` · 국내 단타 원장 `326a0553`, 서버 150요청 · 300모드 실측). 남은 6 = 코인 장기 피하기 — 과거 검산 판단 날 8 < 등록 10(본 기간 뒤 9-29 ~ 만기가 온 판단만) | 규칙을 고른 기간(2018 ~ 2026-09)은 등록상 화면에 못 쓴다 — 날이 쌓이길 기다림(숨기지 않고 결함 꼬리표) | 판단 날 ≥ 10 이 차면 `npm run judgments:signal-skill -- --write` 재실행 — 코인 장기 격자상 11월 중 |

## F017 단계 1c (2026-11-11, `feat/f017-s1c-collection`)

| 항목 | 상태 | 근거 |
|---|---|---|
| 이 REQ 에 닿은 변경 | 충족 | `@repo/core` `symbolCoach.ts` 에 `nearestObservations` · `judgmentEvidenceCount`(`FE-REQ-064` FR-1 — 관망 본 값 줄 · 근거 수). 뷰모델 계약 변경 0(이미 내려오던 `observations`) · 영역 검증 |

## F017 v2 단계 4 등급 (2026-11-11, `feat/f017-s4-grade`)

| 항목 | 결과 | 근거 |
|---|---|---|
| 이 REQ 에 걸린 몫 | 반영 | `salt-microFe/packages/core/src/coach/symbolCoach.ts` — 공유 계약 `ModeCoachViewModel` 에 `tier` · `tierBasis` · 타입 `JudgmentTier` · `JudgmentTierBasis`(BFF 와 같은 모양). 주인 `BFF-REQ-052` FR-1 · `FE-REQ-064` FR-1 |
| 영역 검증 | 통과 | 서버 build · lint · test 1219 · test:layer-check / BFF test 449 · build / FE check-types · lint · test · test:layer-check / 예측 ruff · pyright · lint-imports · pytest · leakage |
| 이 REQ 의 기존 계약 | 변화 없음 | 칸을 더하기만 했다 — 지우거나 바꾼 필드 0 |

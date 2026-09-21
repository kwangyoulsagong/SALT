---
id: BFF-REQ-023
feature: F004
area: bff
kind: FUNC
title: "F004 AI 코치 추천 — BFF 조립 로직 정의 (3종 세트 게이트 전달 · 성적표 그룹)"
priority: critical
labels: [bff, viewmodel, render-gate, coach]
created: 2026-09-09
---

## Summary

BFF는 이미 `/api/app/ai-coach/*` · `/profit-plan` · `/signal-performance` · `/trade-preflight` · `/behavior-coach` 5개 라우트를 갖고 있다. F004의 BFF 작업은 **신규가 아니라 필드 추가와 조립**이다.

가장 중요한 규칙: **BFF가 게이트를 판정하지 않는다.** 서버가 `renderable`을 주고 BFF는 그대로 전달한다.

## 지금 있는 것

| BFF 라우트 | 상태 |
|---|---|
| `GET /api/app/ai-coach/preview` | **기존** — 홈 요약용 |
| `GET /api/app/ai-coach/detail` | **기존** — ~~`signalTrackRecord`·`failureCases` 추가 필요~~ **개정 2026-09-21**: 코드상 이 라우트는 **종목 판단**이다(`app-ai-coach.service.getDetail` — 서버 `/ai-coach?symbol&mode` + `/market-intelligence/:symbol/news?limit=3`). 우측 AI 코치 패널 · 상세 분석 페이지의 뷰모델로 확정한다(아래 2026-09-21 절) |
| `GET /api/app/coach/report` | **신규 (2026-09-21)** — 코치 리포트(리스크 · 후보 · 익절 · 성적표 · 행동 기록). 서버 `/api/coach/detail` 1회. 이전 문서가 `/ai-coach/detail` 에 싣던 것 |
| `GET/PATCH /api/app/ai-coach/profile` | 기존 |
| `POST /api/app/ai-coach/feedback` | 기존 — `reasonCode` 추가 |
| `POST /api/app/ai-coach/explain` | 기존 — **인증 전달 추가** |
| `POST /api/app/ai-coach/generate` (proxy) | 기존 — **쿨다운 429 전달** |
| `GET /api/app/profit-plan` | 기존 — `gapFromCurrent` 추가 |
| `GET /api/app/signal-performance` | 기존 — **그룹 지원 추가** |
| `POST /api/app/trade-preflight` | 기존 |
| `GET /api/app/behavior-coach` | 기존 — `factCode` 추가 |

## 게이트는 전달만 한다

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 서버가 준 **`renderable`·`blockedReason`을 그대로 전달**한다 | Must |
| FR-2 | **BFF가 게이트를 판정하지 않는다.** `signalTrackRecord`가 null인지 보고 `renderable`을 만들지 않는다 | Must |
| FR-3 | **BFF가 게이트를 우회하지 않는다.** `renderable: false`를 `true`로 바꾸는 코드가 0건이다 | Must |
| FR-4 | `signalTrackRecord`가 없으면 **기본값을 만들지 않는다.** `null`을 그대로 전달 | Must |
| FR-5 | `failureCases`가 비면 **빈 배열을 그대로** 전달한다. 채우지 않는다 | Must |
| FR-6 | `renderable: false`가 **200**이다. BFF가 에러로 바꾸지 않는다 | Must |
| FR-7 | 게이트 미충족 카운터를 BFF에서도 남긴다(관측성) | Should |

## 조립 — 코치 리포트 `/api/app/coach/report`

**개정 2026-09-21**: 이 절의 라우트는 원래 `/detail` 이었다. `/detail` 은 종목 판단으로 확정됐으므로(위 표) 코치 리포트를
`/api/app/coach/report` 로 옮긴다. 규칙(FR-10~14)은 그대로다.

서버 `/api/coach/detail`이 이미 조립하므로 **BFF는 필드명 변환과 부분 실패 격리만** 한다.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 서버 `/api/coach/detail` 1회 호출로 받는다. **BFF가 6개 소스를 각각 부르지 않는다** | Must |
| FR-11 | 서버가 필드별 `null`을 주면 그대로 전달하고 `degradedFields[]`에 이름을 넣는다 | Must |
| FR-12 | 서버 호출이 실패하면 **마지막 성공 응답이 없으므로** `status: 'unavailable'`이다. BFF가 캐시하지 않는다 | Must |
| FR-13 | 타임아웃을 둔다(800ms). 초과 시 `unavailable` | Must |
| FR-14 | `staleHours`를 그대로 전달한다. **BFF가 재계산하지 않는다**(서버 시계가 기준이다) | Must |

## 성적표 그룹

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `?groupBy=signalType`을 서버에 전달한다 | Must |
| FR-21 | `lowSample`을 그대로 전달한다. **BFF가 표본 임계를 판정하지 않는다** | Must |
| FR-22 | `status: insufficient_data`를 그대로 전달한다 | Must |
| FR-23 | 기존 무인자 호출을 **하위 호환**으로 유지한다 | Must |
| FR-24 | 샘플 20건 상한을 서버가 지키므로 BFF가 자르지 않는다 | Must |

## 익절 플랜

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | `gapFromCurrent`를 그대로 전달한다. **BFF가 계산하지 않는다** | Must |
| FR-31 | 3자산군을 전달한다. `crypto` 필터를 BFF에 두지 않는다 | Must |
| FR-32 | `trendHold.conditionCode`를 코드로 전달한다. 문구를 만들지 않는다 | Must |

## 행동 기록

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | `factCode` + `params`를 전달한다. **완성 문장을 만들지 않는다** | Must |
| FR-41 | 기존 응답 필드를 **유지**한다(하위 호환) | Must |
| FR-42 | ~~청구서 링크(`invoiceLink`)를 BFF가 만든다~~ **개정 2026-09-21 (ADR-002)**: 청구서가 삭제됐다. `invoiceLink` 를 만들지 않는다 | — |

## 피드백

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | `reasonCode` 4종을 전달한다. **BFF가 검증하지 않는다**(서버가 한다) | Must |
| FR-51 | mutation이므로 **재시도하지 않는다** | Must |
| FR-52 | 성공 시 `insightId`를 반환해 화면이 상태를 갱신할 수 있게 한다 | Should |

## 재생성과 쿨다운

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | `POST /generate`의 **429 + `retryAfterSeconds`를 그대로 전달**한다 | Must |
| FR-61 | **BFF가 쿨다운을 판정하지 않는다.** 서버가 판정한다 — BFF에 상태를 두면 인스턴스가 늘 때 깨진다 | Must |
| FR-62 | 재시도하지 않는다. 쿨다운 중 재시도는 429를 반복할 뿐이다 | Must |
| FR-63 | `GET /api/app/coach/generation-status`를 추가해 남은 시간을 조회한다 | Must |

## `explain` 인증

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-70 | 서버 `explain`이 인증을 요구하게 되므로 **BFF가 토큰을 전달**해야 한다 | Must |
| FR-71 | BFF 라우트에도 `authMiddleware`를 붙인다 | Must |
| FR-72 | rate limit을 BFF에도 둘지 판단한다. **서버가 하면 충분**하다 | Should |

## 종목 판단 뷰모델 — 우측 AI 코치 패널 · 상세 분석 페이지 (2026-09-21)

근거: `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` D2 · D3 · D4 · D7 · B1 · B3 · B9 · B10 · B16 · B23.
계약은 `SRV-REQ-025` 의 `SymbolCoachResult`. BFF 는 **전달과 뉴스 합치기만** 한다.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-90 | `/api/app/ai-coach/detail?symbol&mode` 가 서버 `modes.scalp` · `modes.longTerm` 을 **둘 다** 전달한다. 화면이 모드를 바꿔도 BFF 를 다시 부르지 않는다 | Must |
| FR-91 | **`confidence` 를 옮기지 않는다(D3).** 지금 `mapDecision` 이 `confidence: decision.confidence` 를 복사한다 — 이 줄을 지운다. 서버가 보내더라도 뷰모델에 싣지 않는다 | Must |
| FR-92 | 모드별 `renderable` · `blockedReason` · `trackRecord` · `failureCases` 를 **그대로** 전달한다. 게이트 판정 · 기본값 채우기 0건(FR-1~6 과 같은 규칙) | Must |
| FR-93 | **라벨을 지어내지 않는다.** 지금 `getPreview` 는 `badge: data.modeDecision?.label ?? "관망"` 으로 판단이 없을 때 "관망"을 만든다 — 판단이 없으면 `null` 이다 | Must |
| FR-94 | `mode` 가 없으면 **서버에 넘기지 않는다.** 지금은 BFF 가 `scalp` 로 채운다 — 서버가 `defaultMode`(B16)를 보고 정한다 | Must |
| FR-95 | `zone`(판별 union)을 그대로 전달한다. `priceGap` 을 계산하지 않고 % 로 바꾸지 않으며(D13), 구간 · 가격을 만들지 않는다. `notPrediction` 을 떨어뜨리지 않는다 | Must |
| FR-96 | `gaugeTrackRecords` 를 그대로 전달한다. 표본 판정 · 문구 생성 0건 | Must |
| FR-97 | 뉴스는 지금처럼 `/market-intelligence/:symbol/news?limit=3` 을 합친다. 단 **판단 호출과 병렬**로(지금은 순차). 뉴스 실패는 `degradedFields: ['news']` 이고 판단은 응답한다. 기사 감정 · 종목 연결(B11)은 F000 소관 | Must |
| FR-98 | `validity.code` 를 전달한다. BFF 가 "25분" 같은 문구로 바꾸지 않는다 | Must |
| FR-99 | `preflightDefaults` 는 `{ symbol, entryPrice: 현재가, mode }` 만 준다. **목표가 기본값을 넣지 않는다**(B1) | Must |
| FR-100 | 즉석 해설 `POST /api/app/ai-coach/explain` 은 `authMiddleware` 뒤로 옮기고(FR-70~71) 서버 응답(`renderable` 분기 · `newsSummary` · 3종)을 그대로 전달한다 | Must |
| FR-101 | 주문 전 체크 `POST /api/app/trade-preflight` 는 `stopLossRate` 를 전달하고 `maxLossOfTotalRate` 를 그대로 돌려준다. **주문 · 외부 링크 필드를 만들지 않는다**(B1) | Must |
| FR-102 | 관심 종목 뷰모델(`watchlist.viewmodel.ts`)에 판단 · 신호 필드를 붙이지 않는다(D4). 관심 추가는 기존 watchlist 라우트를 쓴다(B23) | Must |
| FR-103 | 코치 리포트의 성적표 그룹 `returnDistribution` · `hits` · `misses` 를 그대로 전달한다(B17 · B2). 한쪽만 자르지 않는다 | Must |
| FR-104 | 알림 만들기 경로를 만들지 않는다(B19 · B23) | Must |

## 하지 않는 것

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-80 | **점수를 계산하지 않는다** | Must |
| FR-81 | **LLM을 부르지 않는다.** 해설은 서버가 만든 것을 전달한다 | Must |
| FR-82 | **게이트를 판정하지 않는다** | Must |
| FR-83 | **문구를 만들지 않는다.** 코드만 전달 | Must |
| FR-84 | **주문을 중계하지 않는다.** `trade-preflight`는 계산 표시 전용이다 | Must |

## Acceptance Criteria

- [ ] `renderable`·`blockedReason`이 그대로 전달된다
- [ ] **BFF가 게이트를 판정하는 코드가 0건이다** (코드 리뷰)
- [ ] `renderable: false`를 `true`로 바꾸는 코드가 0건이다
- [ ] `signalTrackRecord` null이 기본값으로 채워지지 않는다
- [ ] `failureCases` 빈 배열이 채워지지 않는다
- [ ] `renderable: false`가 200이다
- [ ] `/coach/report`가 서버 `/api/coach/detail` 을 1회 호출한다 (요청 로그) (개정 2026-09-21 — 원래 `/detail`)
- [ ] 서버 필드별 `null`이 `degradedFields[]`에 반영된다
- [ ] `/coach/report` 실패 시 `unavailable`이고 BFF 캐시가 0건이다
- [ ] `staleHours`가 BFF에서 재계산되지 않는다
- [ ] `?groupBy=signalType`이 전달되고 무인자 호출이 하위 호환이다
- [ ] `lowSample`·`insufficient_data`가 그대로 전달된다
- [ ] `gapFromCurrent`가 BFF에서 계산되지 않는다
- [ ] 익절 플랜에 `crypto` 필터가 0건이다
- [ ] `factCode` + `params`가 전달되고 완성 문장이 0건이다
- [ ] `behavior-coach` 기존 응답이 하위 호환이다
- [ ] `reasonCode`가 전달되고 BFF 검증이 0건이다
- [ ] 피드백 mutation 재시도가 0건이다
- [ ] **429 + `retryAfterSeconds`가 그대로 전달된다**
- [ ] BFF에 쿨다운 상태가 0건이다
- [ ] `generation-status` 라우트가 있다
- [ ] `explain` 라우트에 `authMiddleware`가 있다
- [ ] BFF에 점수 계산·LLM 호출·게이트 판정·문구 생성 코드가 0건이다
- [ ] 주문 중계 경로가 0건이다
- [ ] `/ai-coach/detail` 이 두 모드를 전달하고 **`confidence` 가 0건이다**
- [ ] 판단이 없을 때 "관망" 기본 라벨이 0건이다 (`null`)
- [ ] `mode` 없는 요청을 BFF 가 `scalp` 로 채우지 않는다
- [ ] `zone` · `gaugeTrackRecords` · `validity` 가 가공 없이 전달된다
- [ ] 판단 · 뉴스 호출이 병렬이고 뉴스 실패가 `degradedFields` 로 격리된다
- [ ] `preflightDefaults` 에 목표가가 0건이다
- [ ] `explain` 이 인증 뒤에 있고 `renderable` 분기가 그대로 전달된다
- [ ] preflight 가 `stopLossRate` · `maxLossOfTotalRate` 를 통과시킨다
- [ ] 관심 종목 뷰모델에 판단 필드가 0건이다
- [ ] `invoiceLink` 가 0건이다 (ADR-002)

## Dependencies

- **선행:** `BFF-REQ-006`(레이어) · `SRV-REQ-025`(서버 계약)
- **짝:** `BFF-REQ-024`(API) · `025`(UPSTREAM) · `026`(PERF)
- **규칙:** `bff-architecture.md`

## Open Questions

- `/detail`을 서버가 조립할지 BFF가 조립할지. **서버가 조립하면 BFF가 얇아지지만** 서버에 조합 컨텍스트가 필요하다 → `coach` 안에서 조립하는 것이 기본안(같은 컨텍스트다).
- ~~`invoiceLink` 경로 조립을 BFF가 할지 프론트가 할지.~~ — ADR-002 로 닫힘.
- `/ai-coach/detail` 을 종목 판단으로 확정하면서 코치 리포트를 `/coach/report` 로 옮겼다. 이름을 `/ai-coach/symbol` 로 바꿀지는 프론트 소비처가 생긴 뒤 판단한다.
- `explain`이 PM 프로토타입용 public이었다. 인증을 붙이면 프로토타입이 깨진다(`SRV-REQ-025` Open Question).

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` 반영. `/api/app/ai-coach/detail` 을 **종목 판단 뷰모델**로 확정(코드 근거)하고 코치 리포트를 `/api/app/coach/report` 로 분리 — 조립 절 개정. 신규 FR-90~104(두 모드 전달 · **`confidence` 복사 제거**(D3) · "관망" 기본 라벨 제거 · `mode` 기본값 서버 위임(B16) · `zone`/게이지 적중률 전달(D2 · B9) · 뉴스 병렬 · 목표가 기본값 금지(B1) · 관심 종목 판단 필드 금지(D4) · 알림 만들기 없음(B19)). FR-42 무효(ADR-002) |
| 2026-09-21 | `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` D11 ~ D13 반영. FR-30 · FR-95 필드명 `gapFromCurrent` · `priceGap`(D13) |

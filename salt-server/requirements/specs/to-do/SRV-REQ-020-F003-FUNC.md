---
id: SRV-REQ-020
feature: F003
area: srv
kind: FUNC
title: "F003 밸류에이션 밴드 적립 — 도메인 로직 정의 (밴드 엔진 · 김프 · 실패이력 게이트)"
priority: high
labels: [ddd, domain, band-engine, indicator, kimchi-premium]
created: 2026-09-09
---

## Summary

**화면에 숫자 하나**를 만든다: "이번 주 BTC에 375,000원." 기본 적립액 × 밴드 배수다. 그리고 **실패 이력이 없으면 배수 카드를 렌더하지 않는다**는 게이트를 도메인 정책으로 만든다.

## 컨텍스트 배치

| 컨텍스트 | domain | application |
|---|---|---|
| `plan` | `WeeklyPlan` Aggregate · `BandMultiplier` VO · `BaseAmount` VO · `PlanSettingsStore` · `BandPresetStore` · `ExecutionStore` · `IndicatorSource`(Port) · `TrackRecordSource`(Port) · `policy/{band,weekBoundary,execution,baseAmount,monthlySummary}` | `GetWeeklyPlan` · `CreateWeeklyPlans` · `CompleteWeeklyPlan` · `GetPlanSettings` · `UpdatePlanSettings` · `GetMonthlySummary` (2026-09-21: `MatchExecutions` 삭제 — ADR-002) |
| `indicator` | `IndicatorSnapshot` VO · `IndicatorTrackRecord` Aggregate · `SnapshotStore` · `TrackRecordStore` · `IndicatorProbe`(Port) | `CollectIndicators` · `GetLatestIndicator` · `GetTrackRecord` · `api/{IndicatorSnapshotQuery, IndicatorTrackQuery}` |

`indicator`를 별도 컨텍스트로 두는 이유: **F004의 게이트가 실패 이력을 읽는다.** `plan` 안에 두면 `coach`가 `plan`을 부르게 되고 그건 의미가 틀리다.

## 밴드 엔진 (`policy/band`)

### BTC — MVRV Z 5밴드

| 구간 | 배수 | 근거 |
|---|---|---|
| `Z < 0` | **3.0x** | 극단 저평가. 2011·2015·2018·2022 **모든 사이클 바닥**이 이 구간 |
| `0 ≤ Z < 2` | 2.0x | 저평가 |
| `2 ≤ Z < 5` | 1.0x | 중립 |
| `5 ≤ Z < 7` | 0.5x | 과열 |
| `Z ≥ 7` | **0.0x** | 극단 과열. **매도 지시는 하지 않는다** |

### 미국주식 — CAPE 백분위 5밴드

| 구간 | 배수 | 근거 |
|---|---|---|
| `< 20p` | 3.0x | |
| `20~50p` | 2.0x | |
| `50~80p` | 1.0x | |
| `80~95p` | 0.5x | |
| `≥ 95p` | **0.25x** | **0x로 만들지 않는다** — 지수 적립 중단은 장기 기회비용이 크다 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 밴드 판정을 **`policy/band`의 순수 함수**로 만든다. 입력은 지표값 + `BandPreset.rowsJson`. **개정 2026-09-21** — 사용자별 `bandConfigJson` 대신 전역 프리셋(D9) | Must |
| FR-2 | **임계값·배수가 전부 설정값**이다. 코드 상수 0건. 설정값은 **전역 `BandPreset`이고 사용자가 바꿀 수 없다.** **개정 2026-09-21** — D9: 과거 적중률·실패 이력이 기본 밴드로 집계되므로 사용자별 밴드는 그 숫자를 무의미하게 만든다 | Must |
| FR-3 | 경계값에서 정확히 전환된다. `Z = 0`·`2`·`5`·`7`과 ±0.01을 테스트한다 | Must |
| FR-4 | CAPE 최저 배수 **0.25x 하한**을 강제한다 | Must |
| FR-5 | 금액 = `weeklyBaseKrw × multiplier`, **1,000원 단위 반올림** | Must |
| FR-6 | **Puell은 표시만** 한다. 배수 결정에 쓰지 않는다 — 단일 지표 과신 방지 | Must |
| FR-7 | 국내주식은 **밴드 적립 대상이 아니다.** `excluded`로 표시한다(적절한 공개 밸류에이션 지표 부재) | Must |
| FR-8 | **`Z ≥ 7`의 0x에서도 매도 지시를 하지 않는다.** "이번 주 신규 적립 지시 없음" + 밴드 설명까지다. 부분 익절은 F004의 추천 카드에서 3종 세트와 함께 | Must |

## 실패 이력 게이트 (`policy/band` + `TrackRecordSource`)

FEATURE-003 FR-10: *"실패 이력 노출은 렌더 조건이다."*

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 배수 카드 응답에 **`trackRecordId`(필수)** 를 담는다 | Must |
| FR-11 | `IndicatorTrackRecord`가 없으면 **카드를 렌더하지 않는다.** 응답에 `renderable: false` + 사유 | Must |
| FR-12 | 게이트 차단은 **에러가 아니다** | Must |
| FR-13 | 실패 이력은 `indicator` 컨텍스트의 **공개 API**로 받는다. `plan`이 그 테이블을 직접 읽지 않는다 | Must |
| FR-14 | 최소 항목: **MVRV Z 바닥 4/4**, **2025-10 톱 미검출(이후 −52%)** | Must |

## 폴백 (`policy/band`)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 지표 **3일 이상 결측이면 배수를 1.0x(중립)로 폴백**하고 `fallback: true`·`staleDays`를 기록한다 | Must |
| FR-21 | **추정값을 만들지 않는다.** carry-forward는 마지막 실제 값이다 | Must |
| FR-22 | 지표 소스 **전체 실패 시에도 기본액을 제시**한다. "밴드 조정 없음(지표 조회 실패)" | Must |
| FR-23 | 폴백 상태를 계획에 **스냅샷**한다. 나중에 "왜 1.0x였나"를 설명할 수 있어야 한다 | Must |

## 주차 경계 (`policy/weekBoundary`)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | `weekOf` = 그 주의 **KST 월요일 날짜** | Must |
| FR-31 | 일요일 23:59 매수는 그 주, 월요일 00:01은 다음 주. **테스트로 고정** | Must |
| FR-32 | 계획 생성은 멱등(upsert) | Must |
| FR-33 | 주기(주/격주/월)를 설정으로 열지는 **1차 범위 밖**이다. 주 단위 고정 | Should |

## 실행 기록 (`policy/execution`)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 실행 기록은 **수동 체크(`[이번 주 적립 완료]`)만**이다. **개정 2026-09-21** — 원장 sync 자동 매칭 삭제(ADR-002 · 기본안 — 감사 문서 B20) | Must |
| FR-41 | ~~자동 매칭: 주간 윈도우 안의 동일 심볼 매수를 찾는다~~ → **개정 2026-09-21** — 수동 체크는 심볼별 `executedKrw`를 받는다. 생략하면 `plannedKrw`로 기록한다. 음수이거나 상한(그 자산 주간 기본액 × 10)을 넘으면 422 `PLAN_EXECUTION_INVALID` | Must |
| FR-42 | ~~매칭된 거래 id를 기록한다~~ → **개정 2026-09-21** — `recordedAt`만 기록한다. `PortfolioTransaction`을 읽지 않는다(ADR-002) | Must |
| FR-43 | 미실행 주는 `skipped`. **비난 문구 없이 사실만** — 서버는 코드와 수치만 준다 | Must |
| FR-44 | 연속 주차·누적액을 계산한다. **점수·등급 0건** | Must |
| FR-45 | 최근 12주 중 `skipped` 수를 센다 | Must |
| FR-46 | ~~F001의 기계적 적립 트랙을 이 실행 이력으로 대체 가능하게 한다(`?dcaSource=plan`)~~ → **삭제 2026-09-21** — F001이 제품에서 빠졌다(ADR-002) | — |

## 기본액 설정 (`policy/baseAmount`) — 2026-09-21 추가

D9: *설정 = 한 화면. 적립 기본액만 편집, 밴드 임계값은 읽기 전용.* 설정 **화면**은 F006 소유이고 여기서는 값 · 검증 · 환산을 정한다. 온보딩 3단계(기본안 — 감사 문서 B12)가 같은 유스케이스를 쓴다.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-70 | 사용자가 바꾸는 값은 **월 적립액(`monthlyBaseKrw`) 하나**다. 자산별 몫 = 월 적립액 × 기본 배분(서버 설정값) | Must |
| FR-71 | 주간 기본액 = 자산별 월 몫 × 12 ÷ 52, **1,000원 단위 반올림**. 환산은 `policy/baseAmount` 한 곳이다. 프론트·BFF가 환산하지 않는다(공통 기준 ③) | Must |
| FR-72 | 검증: 정수 · **1,000원 단위** · 하한 10,000원 · 상한 100,000,000원. 위반은 422 `PLAN_BASE_AMOUNT_INVALID` + `field`·`min`·`max`. 상·하한은 설정값이다 | Must |
| FR-73 | **밴드 임계값·배수를 바꾸는 입력은 거부한다.** 요청 본문에 `bandConfig`·`thresholds`·`multipliers` 키가 있으면 422 `PLAN_BAND_READ_ONLY`. 조용히 무시하지 않는다 — 사용자는 바뀐 줄 안다 | Must |
| FR-74 | 조회 응답에 밴드 표를 **읽기 전용으로** 담는다(`editable: false` + 사유 코드 `hit_rate_on_default_band`). 화면이 "왜 못 바꾸나"를 설명할 수 있어야 한다 | Must |
| FR-75 | 저장은 **다음 주 계획부터** 반영한다(DB-REQ-014 FR-41). 예외: 사용자 `PlanSettings`가 0건인 **첫 저장**은 그 주 계획을 즉시 만든다(DB-REQ-014 FR-45 · B12) | Must |
| FR-76 | 첫 저장과 수정이 **같은 유스케이스**(`UpdatePlanSettings`, upsert)다. 온보딩 전용 엔드포인트를 두지 않는다 | Must |
| FR-77 | 월 적립액 0원으로 적립을 멈추는 경로는 두지 않는다. 멈춤은 자산별 `enabled: false`다 | Should |

## 이번 달 적립 합계 (`policy/monthlySummary`) — 2026-09-21 추가

기본안 — 감사 문서 B20. 목표 화면 상단(스토리보드 `goals` n1) — 화면은 F000/F006 목표 화면, 숫자는 여기서 만든다.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-80 | `executedKrw` = 그 달(KST)에 `weekOf`가 속한 `executed` 행의 `executedKrw` 합 | Must |
| FR-81 | `plannedKrw` = 같은 행들의 `plannedKrw` 합. `monthlyBaseKrw`(설정값)도 함께 준다 | Must |
| FR-82 | `progressPct` = `executedKrw ÷ plannedKrw`(계획 0이면 `null`) · `daysLeft`(KST 말일까지) · `executedWeeks`·`totalWeeks` 를 **서버가** 계산한다 | Must |
| FR-83 | 달성·미달성 평가 문구를 만들지 않는다. 코드 + 수치만(INV-9와 같은 정책) | Must |

## 김프 (`kimchi-premium`)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | 업비트 `KRW-BTC` vs 바이낸스 `BTC-USDT`(환율 환산) 프리미엄 % | Must |
| FR-51 | 이번 주 적립액 중 **프리미엄 비용을 원화로** 환산해 보여준다 | Must |
| FR-52 | 임계: `≥ +3%` 고비용, `≤ −2%` 저비용. **사실 서술만** — "원화 매수 비용이 평소보다 높습니다" ⭕ / "지금 사지 마세요" ❌ | Must |
| FR-53 | **김프 차익거래 안내를 하지 않는다.** 해외 송금·규제 이슈 | Must |
| FR-54 | 김프 실패 시 **게이지만 숨기고 적립 숫자는 유지**한다 | Must |
| FR-55 | TTL 30초 캐시. 인메모리 | Must |
| FR-56 | **USDT/USD 디페그**를 어떻게 처리할지 → Open Question. 기본안: 디페그 감지 시 `degraded` | Must |

## 근거 문장

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | 근거 한 줄: 지표값 + 밴드명 + 과거 맥락 1문장 | Must |
| FR-61 | **LLM이 숫자를 만들지 않는다.** 계산값을 주입하고 문장만 생성 | Must |
| FR-62 | LLM 실패 시 **규칙 기반 문장으로 폴백**한다 | Must |
| FR-63 | 서버는 **코드 + 수치**를 주고 프론트가 문장을 만드는 것이 기본이다. LLM 문장은 **선택적 보강** | Must |
| FR-64 | 확신 표현·목표주가를 만들지 않는다 | Must |

## Acceptance Criteria

- [ ] `plan`·`indicator` 두 컨텍스트가 있다
- [ ] 밴드 판정이 순수 함수이고 `BandPreset.rowsJson`만 입력으로 받는다
- [ ] **임계값·배수 코드 상수가 0건이다**
- [ ] **MVRV Z 경계값(0/2/5/7)과 ±0.01에서 배수가 정확히 전환된다**
- [ ] **CAPE 최저 배수가 0.25x이고 0x가 0건이다**
- [ ] 금액이 1,000원 단위로 반올림된다
- [ ] Puell이 표시만 되고 배수에 반영되지 않는다
- [ ] 국내주식이 `excluded`로 표시된다
- [ ] **`Z ≥ 7`에서 매도 지시 문구가 0건이다**
- [ ] `trackRecordId`가 응답에 있다
- [ ] **`IndicatorTrackRecord`를 삭제하면 `renderable: false`다**
- [ ] 게이트 차단이 에러가 아니다
- [ ] `plan`이 `IndicatorTrackRecord`를 직접 읽지 않는다 (공개 API 경유)
- [ ] **지표 3일 결측 시 배수가 1.0x로 폴백되고 `fallback: true`가 기록된다**
- [ ] 추정값 생성이 0건이다
- [ ] 지표 전체 실패 시에도 기본액이 제시된다
- [ ] 폴백 상태가 계획에 스냅샷된다
- [ ] `weekOf`가 KST 월요일이고 **일/월 경계 테스트가 고정되어 있다**
- [ ] 계획 생성이 멱등이다
- [ ] **`plan`이 `PortfolioTransaction`·원장을 읽는 경로가 0건이다** (ADR-002 · B20)
- [ ] 수동 체크에 금액을 생략하면 `plannedKrw`로 기록된다
- [ ] 월 1,300,000원 → 주간 기본액 합 300,000원 (×12÷52, 1,000원 반올림)
- [ ] 1,000원 단위가 아니거나 하한·상한을 벗어나면 422 `PLAN_BASE_AMOUNT_INVALID`
- [ ] **본문에 밴드 키가 있으면 422 `PLAN_BAND_READ_ONLY`** (D9)
- [ ] 첫 저장 직후 그 주 계획이 조회된다 (B12)
- [ ] 이번 달 적립 합계가 `executed`만 더하고 진행률·남은 일수가 서버 값이다 (B20)
- [ ] 미실행 주가 `skipped`이고 **비난 문구가 0건이다**
- [ ] 연속 주차·누적액이 계산되고 점수·등급이 0건이다
- [ ] 김프가 프리미엄 %와 원화 비용을 준다
- [ ] 김프 임계 문구가 **사실 서술**이고 지시형이 0건이다
- [ ] **김프 차익거래 안내가 0건이다**
- [ ] 김프 실패 시 적립 숫자가 유지된다
- [ ] 김프가 TTL 30초 캐시다
- [ ] 근거 문장에서 LLM이 숫자를 만들지 않는다
- [ ] LLM 실패 시 규칙 문장으로 폴백된다
- [ ] 확신 표현·목표주가가 0건이다

## Dependencies

- **선행:** `SRV-REQ-006`(DDD) · `DB-REQ-013`~`016`
- **공개:** `indicator/application/api`를 **F004가 소비한다**(게이트의 실패사례)
- ~~연동: `SRV-REQ-012`(F001)~~ — **삭제 2026-09-21**(ADR-002)
- **화면 소유:** 설정 화면·온보딩 = F006, 목표 화면 = F000/F006. 이 REQ는 값·검증·환산만

## Open Questions

- **지표 데이터 소스 미확정**(`DB-REQ-013` Open Question). 소스가 없으면 이 기능이 시작되지 않는다.
- **파워로 1.25x 레짐**을 배수에 넣을지, MVRV Z만 쓸지. 리서치가 파워로 교차점을 제시하지만 **파워로 모델 자체가 논쟁적**이다.
- **USDT/USD 디페그** 처리(FR-56). 디페그 시 김프 계산이 왜곡된다.
- 국내주식용 밸류에이션 지표를 정할지 계속 제외할지.
- 주간이 아닌 격주/월간 주기를 열지.
- 기본 배분(BTC : S&P500 ETF) 비율과, 사용자가 배분을 바꿀 수 있게 할지. D9는 "기본액만 편집"이라 배분 편집은 지금 범위 밖으로 둔다.
- 기본액 하한·상한(10,000원 · 100,000,000원)은 제안값이다. 사용자 확인 필요.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` 반영. FR-1·2(D9 전역 읽기 전용 밴드), FR-40~42(수동 체크만 — ADR-002 · B20) 개정, FR-46 삭제. FR-70~77(기본액 설정 · 온보딩 저장 — D9 · B12), FR-80~83(이번 달 적립 합계 — B20) 추가 |

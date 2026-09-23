---
id: SRV-REQ-024
spec: ../../specs/in-progress/SRV-REQ-024-F004-FUNC.md
checklist: ../checklists/SRV-REQ-024.md
title: F004 AI 코치 추천 — 도메인 로직 회고 (종목 판단 경로)
status: 부분 완료
written: 2026-09-22 (backfill)
---

루트 회고가 흐름 전체를 적는다 — `requirements/reports/retrospects/F004-symbol-judgment.md` · `F004-zone-gauge.md`.
여기는 서버 도메인 쪽 교훈만 둔다.

## 1. 무엇을 했나

종목 판단 경로(FR-100~138)를 두 슬라이스로 닫았다: 스냅샷 · 사후 판정 · 모드별 3종 게이트(`1b8abd4`, PR #48),
피하기 근거 수정(`f722e5f`) · `zone`(`2771a9d`) · 게이지 적중률(`1553a67`, PR #49). 저장 추천 경로(FR-1~91)와
E~G절은 손대지 않았다 — 체크리스트 §3 집계 pass 24 · 미착수 68.

## 2. 잘 된 것

- **판정 규칙이 전부 `domain/policy` 순수 함수다.** `judgeOutcome`(B39) · `isJudgmentSnapshotDue`(독립성) ·
  `judgmentGate` · `judgmentEvidence` · `heldRuleZone` · `observationZone` · `toGaugeTrackRecord`. 사용자 확정으로
  피하기 근거가 바뀌었을 때 고친 자리가 `judgmentEvidence` 한 함수였다(`f722e5f`).
- **컨텍스트 경계를 원천에 맞췄다.** 게이지 집계 SQL 은 `market`(`PrismaSentimentRepository.forwardReturnsByBucket`)이,
  저장은 `coach`(`PrismaGaugeTrackStore`)가 한다. `coach` 는 `market` 공개 API 로 결과만 받는다.
- **기존 계산식을 다시 쓰지 않았다.** `held_rule` 은 `calculateProfitPlan` 을 그대로 부른다(FR-111 · FR-43).
- 워커는 스케줄만 갖고 유스케이스(`SnapshotSymbolJudgments` · `EvaluateSymbolJudgments` · `RefreshGaugeTrackRecords`)를
  부른다(`server-architecture.md` §7).

## 3. 틀렸던 것

### 피하기가 게이트에서 영구 차단 — `f722e5f`

FR-105 의 "근거 = `reasons`" 를 그대로 옮겼더니 `makeModeDecision` 이 피하기 이유를 `risks` 에만 넣어 늘
`reasons_missing` 이었다. 실측(BTC 두 모드)에서 드러났고 사용자 확정 후 FR-138 로 닫았다.

> **Action:** 게이트 입력 필드를 정할 때 판단 함수의 action 별 출력을 먼저 읽는다. 루트 회고 §3 와 같은 조치.

### REQ 가 없는 파일을 "그대로 쓴다"고 했다

FR-104 는 `renderGate.ts`(FR-10)를 쓰라고 했지만 그 파일은 없다. 종목 판단 게이트는 `judgmentGate` 로 따로 섰고,
저장 추천과 **같은 함수를 지나는지**는 FR-10 을 만들 때 다시 판단해야 한다.

> **Action:** FR-10 착수 시 `judgmentGate` 와 합칠지 둘로 둘지를 먼저 정하고 REQ FR-104 를 그 결과로 고친다.

## 4. 남은 기술부채

| 항목 | 근거 |
|---|---|
| FR-115 `excluded_asset` 을 낼 수 없다 | 자산군 enum `crypto` · `stock` — `DB-REQ-003` |
| 관찰 구간 최소 표본(기대 캔들 절반)이 REQ 밖 기준 | `SRV-REQ-024` Changelog |
| 만기 뒤 종가 없는 스냅샷이 판정 배치 200 자리를 계속 차지 | 루트 체크리스트 `F004-symbol-judgment` §4 |
| 워커 실제 회차 미확인 | 두 루트 체크리스트 §4 |
| FR-130 매핑 시드 · FR-133 경로별 카운터 | 미착수 |

## 5. 다음에 보완할 규칙 · 문서

- `ddd-domain.md` §3 표와 §7 목록이 **`coach/domain/policy/renderGate.ts`** 를 3종 세트 불변식의 자리로 적고 있다.
  그 파일은 없고 지금 불변식을 지키는 것은 `coach/domain/policy/symbolJudgment.ts` 다. 규칙 문서를 실제 자리에 맞춘다.
- REQ 본문 FR-107 이 아직 `InvestmentInsight(kind: symbol_judgment)` 다 — `DB-REQ-017` 회고 §5 와 함께 고친다.

## 슬라이스 12 (2026-09-23) — 저장 추천 게이트 · 익절 거리 · 행동 기록

- **게이트를 하나로 합치지 않았다.** 스펙은 `renderGate.ts` 하나를 그렸지만 종목 판단(표본 20 미만 차단 ·
  `insufficient_sample`)과 저장 추천(표본 1 이상 통과 · FR-32)은 규칙이 다르다. 합치면 분기 플래그가 생기고,
  그 플래그가 FR-15 가 금지한 "우회 인자"와 모양이 같아진다. 두 함수로 두고 차이를 주석에 적었다
- **DB JSON 을 믿지 않는 읽기를 도메인에 뒀다**(`readStoredRecommendation` · `toBehaviorFact`). 모양이 어긋나면
  반쯤 채우지 않고 `null` 이다 — 반쯤 채운 `params` 는 틀린 문장을 만든다
- 체크리스트의 저장 추천 행이 FR-1~91 을 몇 줄로 묶고 있어 집계가 부정확했다. 이번에 FR 단위로 쪼갰고,
  옛 미착수 수는 다시 세지 않고 "나머지"로 뒀다

## Action

- FR-13 은 `DB-REQ-013`(F003 `IndicatorTrackRecord`)이 생겨야 닫힌다
- FR-17 · FR-133 게이트 차단 카운터 — 지금 저장 추천은 100% 차단이라 카운터가 가장 먼저 보여줄 사실이다


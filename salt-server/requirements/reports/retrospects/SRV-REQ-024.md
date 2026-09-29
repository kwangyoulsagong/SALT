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


## F010 슬라이스 0 (2026-09-28) — 성적표 신뢰성

- 감사 문서가 "5분봉 RSI 가 잡음"이라 적었지만 실 DB 는 **지표 0행**이었다 — 조회 이름(`m5`)과 저장 이름(`5m`)이 달랐고, 두 이름을 잇는 테스트가 없었다. 워커가 조용히 `return` 하는 분기(`candles.length < 50`)는 로그가 없어 몇 달을 숨었다. **조용한 `return` 에는 카운터를 단다**
- 저장 표본을 지우지 않는 원칙은 지켰지만, 그 표본이 "재료 없이 낸 판단"이라는 사실은 행에 없다. 채점 대상 행에는 판단 시점 재료(지표 주기 · 값 · 결측)를 같이 남긴다 — 슬라이스 1
- 경계 상수(`ROUND_TRIP_COST`)를 도메인 하나에 두고 SQL 은 파라미터로 받게 했지만, 재판정 마이그레이션은 상수를 SQL 에 다시 적었다. `outcome` 저장 대신 읽을 때 정책으로 계산하면 이 중복이 사라진다

## F010 슬라이스 1 (2026-09-29) — 대형 체결 수집 · 예측 원장

- **고래 데이터가 적었던 원인은 데이터 원천이 아니라 수집 경로였다.** 저장이 화면 호출(`/smart-money`)에만 붙어 있었다. 사용자가 "고래를 늘리라"고 했을 때 가중부터 봤다면 못 찾았다 — `SELECT count(*)` 한 줄이 먼저였다(슬라이스 0 회고 그대로)
- 재개 지점 결함은 테스트가 아니라 **실 DB 두 번째 회차**가 잡았다. 테스트는 "마지막 대형 체결 뒤부터"를 정답으로 적어 두고 있었다 — 정답이 틀리면 테스트는 통과한다. 수집기는 한 번이 아니라 **두 번 연속** 돌려 본다
- 개발 서버가 `tsx watch` 로 바뀐 코드를 바로 돌려서, 같은 IP 에 수집기 둘이 섞였다. 로컬 실측의 429 · 소요 시간은 운영 값이 아니다 — 체크리스트에 그렇게 적었다
- 항목 기여를 `ModeDecision` 에 넣었다가 `dualDecision` 이 통째로 응답에 나가는 걸 보고 뺐다. **도메인 타입을 응답으로 그대로 내보내는 경로**가 있으면 필드 하나가 계약 변경이 된다

## Action

- `mode-decision@2` 전에 `symbol_judgment_snapshots` · 원장에 규칙 버전 필터(성적표가 버전을 섞지 않게)
- 대형 체결 10만 행 뒤 정렬 계획 재확인

## F010 슬라이스 1 — `mode-decision@2` (2026-09-29)

- @1 장기 24시간 항목은 감점(−6)인데 문장을 "근거" 칸에 넣고 있었다. 점수 방향과 문장 칸이 어긋나면 화면은 감점 이유를 근거로 보여 준다 — v2 에서 맞췄고 문구 가드 테스트가 전 조합을 돈다
- 해설 사실이 점수 함수와 다른 파일에서 재료를 골랐다. 점수 항목 표(`SCORED_ITEMS`)를 규칙 옆에 두고 해설이 그것을 읽게 했다

## F010 슬라이스 2 (FR-180 · 181, 2026-09-29)

- 익절 계획을 바꾸는 자리가 셋(목록 · zone · 상세)이었는데 계산이 이미 한 함수라 인자 하나로 끝났다. 변동성 읽기를 종목 하나씩(`realizedVolatility`)
  부르면 목록 화면이 보유 수만큼 쿼리를 쏜다 — 배치 포트(`symbolRisk`)를 먼저 만들었다
- σ 계획은 "좋아진" 것이 아니라 **정의를 라벨과 맞춘** 것이다. 손절 한 번 손실이 평균 −16% 로 고정(−7.8%)의 두 배다 — 화면이 이 차이를 말하지
  않으면 사용자는 손절선이 멀어진 이유를 모른다. 슬라이스 3 에서 `basis` 를 문구로
- 커밋 전에 `prettier --write` 를 돌려 레포에 없는 포맷 설정으로 무관한 30여 파일을 바꿨다. 되돌리고 수정만 다시 적용했다 — **포맷터는 레포 설정이 있을 때만**

## Action (F010 슬라이스 2)

- 슬라이스 3: 익절 가격선에 근거(변동성 배수 · 고정) 한 줄

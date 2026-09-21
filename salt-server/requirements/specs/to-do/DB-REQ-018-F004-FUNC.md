---
id: DB-REQ-018
feature: F004
area: db
kind: FUNC
title: "F004 AI 코치 추천 — 데이터 불변식 정의 (3종 세트 게이트 · 피드백 유일성 · 쿨다운)"
priority: high
labels: [db, invariant, render-gate, cooldown, feedback]
created: 2026-09-09
---

## Summary

F004의 불변식은 대부분 **렌더 게이트**에 걸린다 — 근거·적중률·실패사례 3종이 없으면 추천이 렌더되지 않아야 하고, 그 판정의 근거가 DB에 있어야 한다.

## 불변식 목록

| ID | 불변식 | 지키는 장치 | 깨지면 |
|---|---|---|---|
| INV-1 | 한 추천에 피드백 1건 | `@@unique([userId, insightId])` | 피드백 분포가 왜곡된다 |
| INV-2 | 피드백은 존재하는 insight를 참조한다 | FK + `onDelete: Cascade` | 고아 피드백 |
| INV-3 | `signalType`이 있으면 성적표를 찾을 수 있다 | 매핑 검증 | **추천 카드가 렌더되지 않는다**(정상) |
| INV-4 | 실패 이력이 없으면 추천이 렌더되지 않는다 | `IndicatorTrackRecord` 조회 + 게이트 | 정책 위반 |
| INV-5 | 재생성이 5분 안에 두 번 일어나지 않는다 | `CoachGenerationLog` + 쿨다운 판정 | LLM 비용·서버 부하 |
| INV-6 | `score`가 0~100 | CHECK 제약 | 화면이 깨진다 |
| INV-7 | `action`이 4종 | 서비스 검증 | 화면이 알 수 없는 action을 만난다 |
| INV-8 | LLM 프롬프트·응답이 저장되지 않는다 | 스키마에 그 컬럼이 없다 | 개인정보·비용 노출 |
| INV-9 | 개별 미국 주식 신규 매수 추천이 생성되지 않는다 | 서비스 게이트 | **법적 포지셔닝 위반** |
| INV-10 | 신뢰도(`confidence`)가 응답 · 새 컬럼에 없다 (D3) | 응답 매퍼 · 스키마 리뷰 | 점수가 확률로 읽힌다 |
| INV-11 | 스마트 바이존 · 관찰 구간이 서버 계산이고 수익률 · 목표가를 담지 않는다 (D2) | 응답 타입 · FR-63 | **공통 기준 ④ 위반** |
| INV-12 | 종목 판단 스냅샷이 (종목 · 모드 · 시간 버킷)당 1건 | `dedupeKey` 유니크 | 표본이 부풀려져 적중률이 왜곡된다 |
| INV-13 | 게이지 적중률 표본 < 20 이면 `lowSample` | 서비스 판정 | 근거 없는 한 줄이 근거처럼 보인다 |
| INV-14 | 미보유 개별 주식에는 관찰 구간이 없다 (Q3 결정 전) | 서비스 게이트 | 글로벌 플랜 §1-3 경계를 넘는다 |

## Requirements

### A. 3종 세트 게이트의 데이터 근거 (INV-3, INV-4)

**근거·적중률·실패사례 중 하나라도 없으면 카드를 렌더하지 않는다.** 그 판정에 필요한 데이터를 DB가 제공해야 한다.

| 요소 | 데이터 출처 | 없으면 |
|---|---|---|
| 근거 | `InvestmentInsight.payload.reasons` + `topCandidateFactors` | 게이트 차단 |
| 적중률 | `signal-performance` 계산 (입력: `InvestmentInsight` + `PriceHistory`) | 게이트 차단 |
| 실패사례 | `IndicatorTrackRecord.missesJson` | 게이트 차단 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | `signalType`이 `null`이면 성적표를 찾을 수 없다 → **게이트 차단**. 이것이 정상 동작이다 | Must |
| FR-2 | `signalType`과 `IndicatorTrackRecord.indicator`의 **매핑 테이블을 명시**한다. 코드 상수가 아니라 데이터로 관리한다 | Must |
| FR-3 | 성적표 **표본이 20건 미만**이면 `lowSample: true`다. 게이트를 차단할지는 정책 결정(`SRV-REQ-024` Open Question) | Must |
| FR-4 | `IndicatorTrackRecord`를 삭제하면 **카드가 렌더되지 않는지** 테스트로 검증한다 | Must |
| FR-5 | 게이트 차단은 **에러가 아니다.** `renderable: false` + `blockedReason`으로 표현한다 | Must |

### B. 피드백 (INV-1, INV-2)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 같은 추천에 두 번 피드백하면 **덮어쓴다**(upsert). 두 행이 생기지 않는다 | Must |
| FR-11 | insight가 삭제되면 피드백도 삭제된다(`Cascade`) | Must |
| FR-12 | `reasonCode`는 4종 중 하나이거나 `null`이다. 서비스가 검증한다 | Must |
| FR-13 | `note`는 최대 500자다. 서비스가 검증한다 | Must |
| FR-14 | **피드백을 점수 엔진에 반영할지는 결정하지 않았다.** 지금은 기록만 한다 — 반영하면 개인화이고 그건 별도 결정이다 | Must |

### C. 쿨다운 (INV-5)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 재생성 쿨다운 **5분**을 `CoachGenerationLog.requestedAt`으로 판정한다 | Must |
| FR-21 | **실패한 요청도 로그에 남긴다.** 실패를 빌미로 무한 재시도하면 LLM 비용이 폭발한다 | Must |
| FR-22 | 쿨다운 거부도 로그에 남긴다(`status: cooldown_rejected`). 사용자가 얼마나 누르는지 알아야 한다 | Must |
| FR-23 | 쿨다운 5분은 **설정값**이다. 코드 상수 금지 | Must |
| FR-24 | 워커 생성(`source: worker`)은 쿨다운 대상이 아니다. 주기가 이미 정해져 있다 | Must |

### D. 값 범위 (INV-6, INV-7)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | `score >= 0 AND score <= 100` CHECK 제약 | Must |
| FR-31 | `action`은 `buy`·`sell`·`hold`·`rebalance` 4종. **서비스가 검증**한다(enum으로 만들면 값 추가가 마이그레이션이 된다) | Must |
| FR-32 | `kind`는 `recommendation`·`coach_feedback`·`behavior`·`risk` 4종. 동일. **개정 2026-09-21**: `symbol_judgment` 를 더해 **5종**(`DB-REQ-017` FR-50) | Must |
| FR-33 | **`score`가 확률이 아니다.** 화면이 "72점은 72% 확률이 아닙니다"를 표시해야 하고, 그 문구를 DB가 강제하지는 않지만 응답 계약에 `scoreNote`를 둔다 | Must |

### E. LLM 데이터 미저장 (INV-8)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | **프롬프트·LLM 응답 원문을 저장하는 컬럼을 만들지 않는다** | Must |
| FR-41 | 생성된 **문장(해설)만** `payload.explanation.text`에 저장한다 | Must |
| FR-42 | `CoachGenerationLog`에 `llmSource`(`llm`/`rule`)와 `durationMs`만 남긴다. **내용은 남기지 않는다** | Must |
| FR-43 | LLM 프롬프트에 계좌 식별자·거래소 키를 넣지 않는다(서비스 규칙, `SRV-REQ-024`) | Must |

### F. 추천 범위 제한 (INV-9)

글로벌 플랜 1-3절: **개별 미국 주식 신규 매수 추천 금지.** 지수/ETF 단위 또는 보유 종목 관리만.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | 생성 시 **`assetType == us_stock` && `action == buy` && 미보유 && 개별 종목**이면 거부한다 | Must |
| FR-51 | 그 판정에 필요한 데이터: `InvestmentInsight.assetType` · `action` · `PortfolioHolding` 존재 여부 · **종목이 지수/ETF인지** | Must |
| FR-52 | **종목이 지수/ETF인지 판정할 데이터가 없다.** `MarketAsset`에 그 구분이 없다 → **분류 컬럼 또는 화이트리스트가 필요하다**(Open Question) | Must |
| FR-53 | `kr_stock`은 추천 대상에서 **제외**한다(실시간 데이터·지표 부재). 보유 표시와 비중 경고만 | Must |

### G. 종목 판단 · 바이존 · 게이지 적중률 (2026-09-21 · INV-10~14)

근거: `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` D2 · D3 · B9 · B10 · B18 · Q3.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | 종목 판단 스냅샷의 `signalType` 은 **`<mode>.<action>`** 이다(예: `scalp.review_short_opportunity`). 매핑 표는 `SRV-REQ-024` 에 있고 데이터로 시드한다(`DB-REQ-019` FR-20~24) | Must |
| FR-61 | 스냅샷은 `dedupeKey = symbol_judgment:<symbol>:<mode>:<시간 버킷>` 으로 upsert 한다. 같은 버킷에 두 행이 생기지 않는다 | Must |
| FR-62 | **신규 코드가 `InvestmentInsight.confidence` 를 쓰지 않는다.** 기존 행의 값은 남되 어떤 응답에도 실리지 않는다 | Must |
| FR-63 | 스마트 바이존(D2)은 **요청 시 서버가 계산**한다. 보유 = `profit-plan` 3단계 가격, 미보유 = `PriceHistory` 종가 분포의 하단 · 중앙 · 상단. **수익률 · 목표가 · 예상 도달 시점 필드를 저장하지 않는다** | Must |
| FR-64 | 관찰 구간 표본(해당 기간 종가 수)이 기준 미만이면 구간을 만들지 않는다 → `zone.kind: unavailable` + `reasonCode`. 추정값으로 채우지 않는다 | Must |
| FR-65 | `GaugeTrackRecord.sampleCount < 20` 이면 응답에 `lowSample: true`. 행을 지우거나 숨기지 않는다 | Must |
| FR-66 | `GaugeTrackRecord` 의 30일 뒤 가격이 아직 없는 시점(최근 30일)은 **표본에서 뺀다.** 미래 값을 추정하지 않는다 | Must |
| FR-67 | **Q3 결정 전**, `assetType == us_stock` · 미보유 · 지수/ETF 아님이면 관찰 구간을 만들지 않는다(`reasonCode: scope_undecided`). `kr_stock` 은 FR-53 대로 제외 | Must |
| FR-68 | 보유 판정은 `PortfolioHolding`(기존 `PortfolioTransaction` 집계)이다. 원장 · 결제일 기준 판정은 없다(ADR-002) | Must |

## Acceptance Criteria

- [ ] `signalType`이 `null`인 insight에서 카드가 렌더되지 않는다
- [ ] `signalType` ↔ `IndicatorTrackRecord.indicator` 매핑이 **데이터로 관리**된다
- [ ] 표본 < 20에서 `lowSample: true`다
- [ ] **`IndicatorTrackRecord`를 삭제하면 카드가 렌더되지 않는다** (테스트)
- [ ] 게이트 차단이 에러가 아니라 `renderable: false` + `blockedReason`이다
- [ ] 같은 추천에 두 번 피드백하면 행이 1건이다
- [ ] insight 삭제 시 피드백이 함께 삭제된다
- [ ] `reasonCode`가 4종 또는 `null`이다
- [ ] `note`가 500자를 넘으면 거부된다
- [ ] **5분 안에 두 번 재생성하면 두 번째가 거부된다**
- [ ] 실패한 요청과 거부된 요청이 로그에 남는다
- [ ] 쿨다운이 설정값이다 (코드 상수 0건)
- [ ] 워커 생성이 쿨다운 대상이 아니다
- [ ] `score` CHECK 제약이 있다 (범위 밖 insert 실패)
- [ ] `action`·`kind`가 서비스에서 검증된다
- [ ] **프롬프트·LLM 응답 원문 컬럼이 0건이다**
- [ ] `CoachGenerationLog`에 내용이 저장되지 않는다
- [ ] **개별 미국 주식 신규 매수 추천이 생성되지 않는다** (합성 케이스)
- [ ] `kr_stock` 추천이 0건이다
- [ ] `kind` 가 5종(`symbol_judgment` 포함)이다
- [ ] 종목 판단 스냅샷이 같은 버킷에 1건이다 (upsert 2회 → 행 1건)
- [ ] **신규 코드에서 `confidence` 읽기 · 쓰기가 0건이다**
- [ ] 바이존 · 관찰 구간 응답에 수익률 · 목표가 필드가 0건이다
- [ ] 관찰 구간 표본 부족 시 `unavailable` + `reasonCode` 이고 추정값이 0건이다
- [ ] `GaugeTrackRecord` 표본 < 20 에서 `lowSample: true` 다
- [ ] 최근 30일 시점이 게이지 표본에서 빠진다
- [ ] 미보유 개별 미국 주식에 관찰 구간이 0건이다 (합성 케이스)

## Dependencies

- **선행:** `DB-REQ-017`(스키마) · `DB-REQ-013`(`IndicatorTrackRecord`)
- **구현:** `SRV-REQ-024`(F004 FUNC)

## Open Questions

- **종목이 지수/ETF인지 판정할 데이터가 없다.** `MarketAsset`에 분류 컬럼을 추가할지, 화이트리스트(`VOO`·`SPY`·`QQQ` …)를 둘지 결정 필요. **FR-50 착수 전 선결** — 이것이 없으면 법적 포지셔닝 제약을 코드로 강제할 수 없다.
- `signalType` 매핑(`DB-REQ-017` Open Question과 동일). **F004 최대 미결 사항.**
- ~~표본 < 20에서 게이트를 차단할지.~~ **개정 2026-09-21 (B18)**: 표본 1건 이상이면 통과 + `lowSample` 표시(`SRV-REQ-024` FR-32 기본안), 표본 0건이라 **전부 미렌더인 초기 상태는 정상 UX** 로 다룬다.
- **Q3** — 미보유 주식 종목의 관찰 구간 적용 범위(FR-67 은 결정 전 보수안).
- 피드백을 점수 엔진에 반영할지(FR-14).

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` 반영. INV-10~14 · 신규 FR-60~68(종목 판단 스냅샷 · 신뢰도 미사용(D3) · 바이존 서버 계산(D2) · 게이지 적중률 표본 규칙(B9) · Q3 보수안 · 보유 = `PortfolioTransaction`(ADR-002)). FR-32 개정(kind 5종). 표본 < 20 Open Question 을 B18 로 닫음 |

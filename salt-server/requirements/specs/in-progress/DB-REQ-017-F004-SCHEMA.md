---
id: DB-REQ-017
feature: F004
area: db
kind: SCHEMA
title: "F004 AI 코치 추천 — 스키마 정의 (kind 컬럼 승격 · 피드백 · 실패 이력 참조)"
priority: high
labels: [db, prisma, schema, coach, insight, json-to-column]
created: 2026-09-09
source: pm/requirements/specs/in-progress/FEATURE-004-ai-coach-screen.md
---

> **v2 대체 (2026-11-10, `FEATURE-017` v2 · `ADR-010` v2)** — 종목 판단은 숨기지 않는다: 판단 · 관측 · 성적 · 실패사례는 늘 나가고 예전 막힘 사유는 꼬리표 `caveats[]`. 3종은 늘 다 있어야 한다 — 비면 막지 않고 과거 검산으로 채운다. 이 문서에서 바뀐 FR: FR-62(메모만) (아래 그 자리에 표시). 저장 추천 카드 게이트 · 전망 게이트는 그대로.

> **2026-10-29 전수 조사 — 아래 본문 중 지금과 다른 것** (본문은 당시 기록으로 둔다)
> - "Prisma 에 컬럼이 없다 · `unsupportedPersistedFields`"는 지난 일 — `default_mode` · `notification_level` 열이 있다(FR-20~22 완료 2026-09-23, `ManageCoachProfile.ts`)
> - "지금 문제" 절의 `signal-performance.service.ts` 는 없다 — `coach/application/GetSignalPerformance.ts`, 저장 추천 성적은 원장 `coach_recommendation_snapshots`(`SRV-REQ-024` FR-176). 절은 2026-09-09 당시 기록


## Summary

F004는 **서버에 이미 있는 엔진을 화면으로 만드는 것**이므로 신규 모델이 적다. 핵심 스키마 변경은 **`InvestmentInsight.payload` JSON을 조건으로 뒤지는 현재 패턴을 컬럼으로 승격**하는 것과 **`CoachFeedback` 신설**이다.

`IndicatorTrackRecord`(실패 이력)는 `DB-REQ-013`(F003)이 만들고 F004가 **공유**한다.

## 지금 문제 — JSON을 조건으로 뒤진다

`signal-performance.service.ts`:

```ts
const insights = await prisma.investmentInsight.findMany({
  where: { userId, type: 'ai_coach' },
  orderBy: { createdAt: 'desc' },
  take: 100,
});
for (const insight of insights) {
  const payload = insight.payload as Record<string, any> ?? {};
  if (payload.kind === 'coach_feedback') continue;   // ← 애플리케이션에서 버린다
  const symbol = insight.symbol ?? payload.symbol ?? payload.recommendation?.symbol;
  ...
}
```

100건을 읽어와 루프로 버린다. **`payload.kind`는 인덱스를 못 쓰고, `payload.recommendation.symbol`은 계약이 아닌데 계약처럼 쓰인다.**

## Schema — 컬럼 승격

```prisma
model InvestmentInsight {
  // ... 기존 필드 유지 ...

  kind        String?   @map("kind")           // "recommendation" | "coach_feedback" | "behavior" | "risk"
  action      String?   @map("action")         // "buy" | "sell" | "hold" | "rebalance"
  score       Int?      @map("score")          // 0~100
  signalType  String?   @map("signal_type")    // signal-performance 그룹 키
  generatedAt DateTime? @map("generated_at")   // payload 안이 아니라 컬럼으로

  @@index([userId, type, createdAt(sort: Desc)])
  @@index([userId, kind, createdAt(sort: Desc)])
  @@index([userId, signalType, createdAt(sort: Desc)])
}
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | `kind` 컬럼을 승격한다. **`payload.kind` 조건 쿼리를 없애는 것이 목적**이다 | Must |
| FR-2 | `action`·`score`를 승격한다. 화면이 정렬·필터에 쓴다 | Must |
| FR-3 | **`signalType`을 승격한다.** `signal-performance`가 신호 유형별로 그룹화해야 하고(F004 FR-8), JSON에서는 그룹 쿼리가 안 된다 | Must |
| FR-4 | `generatedAt`을 승격한다. `staleHours` 계산에 쓴다 | Must |
| FR-5 | `@@index([userId, type, createdAt DESC])`를 추가한다. 최근 100건 최신순 조회를 덮는다 | Must |
| FR-6 | `@@index([userId, kind, createdAt DESC])` · `@@index([userId, signalType, createdAt DESC])`를 추가한다 | Must |
| FR-7 | `payload`는 **표시용 스냅샷으로 남긴다**(`reasons`·`risks`·`candidates`·`topCandidateFactors`). 조건으로 쓰지 않는다 | Must |
| FR-8 | 기존 row는 승격 컬럼이 `null`이다. **백필은 `DB-REQ-019`가 담당**한다 | Must |

## Schema — 신규

```prisma
model CoachFeedback {
  id         String   @id @default(uuid())
  userId     String   @map("user_id")
  insightId  String   @map("insight_id")
  helpful    Boolean
  reasonCode String?  @map("reason_code")      // insufficient_evidence | already_known | seems_wrong | not_actionable
  note       String?  @db.Text
  createdAt  DateTime @default(now()) @map("created_at")

  user    User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  insight InvestmentInsight @relation(fields: [insightId], references: [id], onDelete: Cascade)

  @@unique([userId, insightId])
  @@index([userId, createdAt(sort: Desc)])
  @@index([helpful, reasonCode])
  @@map("coach_feedbacks")
}

model CoachGenerationLog {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  requestedAt DateTime @map("requested_at")
  source      String                          // "worker" | "manual"
  status      String                          // "running" | "succeeded" | "failed" | "cooldown_rejected" (running — 개정 2026-09-23)
  llmSource   String?  @map("llm_source")     // "llm" | "rule"
  durationMs  Int?     @map("duration_ms")
  errorCode   String?  @map("error_code")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, requestedAt(sort: Desc)])
  @@map("coach_generation_logs")
}
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | `CoachFeedback` 신설. `@@unique([userId, insightId])` — **한 추천에 피드백 1건** | Must |
| FR-11 | `reasonCode` 4종(근거 부족 / 이미 알고 있음 / 틀린 것 같음 / 실행 불가). **코드**이고 문구는 프론트가 만든다 | Must |
| FR-12 | `@@index([helpful, reasonCode])`로 피드백 분포 집계를 덮는다 | Must |
| FR-13 | **`CoachGenerationLog` 신설.** 재생성 **5분 쿨다운**(F004 FR-15)을 판정하려면 마지막 요청 시각이 필요하다. `InvestmentInsight.createdAt`으로는 실패·거부 요청을 알 수 없다 | Must |
| FR-14 | `CoachGenerationLog`에 `llmSource`를 둔다. **LLM 성공률 관측**(F004 관측성)의 근거다 | Must |
| FR-15 | `User`에 두 모델 역참조를 추가한다 | Must |

## Schema — 프로필 확장

`ai-coach.routes.ts`의 Swagger에 `defaultMode`·`notificationLevel`이 있으나 **Prisma에 컬럼이 없다.** 응답에서 `unsupportedPersistedFields`로 나가고 있다.

```prisma
model UserInvestmentProfile {
  // ... 기존 필드 유지 ...
  defaultMode       String? @map("default_mode")        // "scalp" | "long_term"
  notificationLevel String? @map("notification_level")  // "low" | "medium" | "high"
}
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `defaultMode`·`notificationLevel` 컬럼을 추가한다. **Swagger가 이미 계약으로 노출하고 있으므로 컬럼 추가가 맞다**(FEATURE-004는 "UI 숨김"도 대안으로 뒀으나, 계약이 이미 나가 있으면 컬럼이 낫다). **개정 2026-09-21**: "UI 숨김" 대안을 닫는다 — 두 모드를 노출하고(D3) `defaultMode` 가 모드 스위치의 초기값이 된다(B16). `notificationLevel` 은 알림 1종(지표 · 추천 갱신, D5)의 빈도 단계다. `benchmarkSymbol`(옛 `DB-REQ-005`)은 ADR-002 로 삭제된 F001 소관이라 이 모델에 더하지 않는다 | Must |
| FR-21 | 둘 다 nullable이다. 기존 row에 값이 없다 | Must |
| FR-22 | 값 검증은 서비스 레이어가 한다. DB에 CHECK를 걸지 않는다 — 값 목록이 바뀔 수 있다 | Should |

## Schema — `InsightType` 정리

현재 `enum InsightType { ai_coach, smart_buy_zone, behavior_analysis, risk_alert }`.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | **개정 2026-09-21 (D2)**: `smart_buy_zone` **생성 중단을 철회**한다. 스마트 바이존을 살리되 **새 규칙으로 서버가 계산**한다 — 보유 종목 = `profit-plan` 규칙 가격(손실 제한 · 1차 익절 · 추세 유지), 미보유 종목 = 과거 가격 분포 기반 **관찰 구간**. 워커가 남기는 구간 스냅샷의 `type` 이 `smart_buy_zone` 이다(구간 진입 후 결과를 나중에 셀 근거). **옛 예측형 매수존 로직(매수 적정가 · 수익률 표기)은 되살리지 않는다.** 원래 문장: "3종 유지, `smart_buy_zone`은 enum에 남기고 생성만 중단" | Must |
| FR-31 | enum 값 제거는 Postgres에서 타입 교체다. **기존 row가 있으면 제거하지 않는다** | Must |
| FR-32 | ~~`smart_buy_zone` row가 0건이면 별도 릴리스에서 제거를 검토한다~~ **개정 2026-09-21**: FR-30 개정으로 제거 검토 대상이 아니다 | — |

## Schema — 종목 판단 스냅샷 · 게이지 적중률 (2026-09-21)

근거: `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` D2 · D3 · B9 · B10 · B16 · B18.
투자 화면 우측 AI 코치 패널과 상세 분석 페이지가 **종목 단위 판단**(`GET /api/ai-coach?symbol&mode`)에도
3종 세트를 붙여야 한다(B10). 그런데 지금 종목 판단은 **요청 때 계산하고 버린다** — 저장되지 않으니
성적표 표본이 영원히 0이다. 그래서 판단을 스냅샷으로 남기고, 게이지 적중률(B9)은 따로 집계한다.

```prisma
model InvestmentInsight {
  // ... FR-1~8 의 승격 컬럼 유지 ...
  mode        String?   @map("mode")           // "scalp" | "long_term" — 종목 판단 스냅샷만 채운다
  // kind 에 "symbol_judgment" 추가 (FR-50)
  // confidence Float? — 기존 컬럼. 지우지 않고 새 코드가 쓰지 않는다 (FR-54)

  @@index([symbol, kind, mode, createdAt(sort: Desc)])
}

model GaugeTrackRecord {
  id           String   @id @default(uuid())
  symbol       String
  gauge        String                          // "sentiment" | "smart_money"
  bucket       String                          // "0_20" | "20_40" | "40_60" | "60_80" | "80_100"
  horizonDays  Int      @default(30) @map("horizon_days")
  sampleCount  Int      @map("sample_count")
  p25Return    Decimal? @map("p25_return")  @db.Decimal(9, 4)
  medianReturn Decimal? @map("median_return") @db.Decimal(9, 4)
  p75Return    Decimal? @map("p75_return")  @db.Decimal(9, 4)
  positiveRate Decimal? @map("positive_rate") @db.Decimal(5, 4)
  windowFrom   DateTime @map("window_from")
  windowTo     DateTime @map("window_to")
  computedAt   DateTime @map("computed_at")

  @@unique([symbol, gauge, bucket, horizonDays])
  @@map("gauge_track_records")
}
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | `kind` 에 **`symbol_judgment`** 를 더한다. 워커가 추적 자산(D8 · 보유 포함) × 두 모드 판단을 스냅샷으로 남긴다. **이것이 없으면 종목 경로의 적중률 표본이 영원히 0이다** | Must |
| FR-51 | `mode` 컬럼을 승격한다. 종목 판단의 `signalType` 은 `<mode>.<action>`(예: `long_term.review_accumulation`)이고 모드별 성적표를 그룹으로 뽑아야 한다(`SRV-REQ-024` 매핑 표) | Must |
| FR-52 | `@@index([symbol, kind, mode, createdAt DESC])` — 종목 · 모드별 최근 판단 조회를 덮는다 | Must |
| FR-53 | 스냅샷 중복 방지는 기존 `@@unique([userId, type, dedupeKey])` 를 쓴다. `dedupeKey = symbol_judgment:<symbol>:<mode>:<시간 버킷>` | Must |
| FR-54 | **신뢰도(`confidence`)를 계약에서 뺀다(D3).** 기존 `InvestmentInsight.confidence` 컬럼은 롤백 안전을 위해 **지우지 않고**, 새 코드가 쓰지도 읽지도 않는다. 새 컬럼 · 새 모델에 신뢰도 필드를 만들지 않는다 | Must |
| FR-55 | **`GaugeTrackRecord` 신설 (B9).** 심리 온도계가 어떤 구간에 있던 과거 시점들의 **30일 뒤 수익률 분포**(하위 25% · 중앙값 · 상위 25% · 양수 비율 · 표본 수)를 미리 집계해 둔다. 입력은 `MarketSentiment`(`sentimentScore`, `@@index([symbol, calculatedAt])` 기존) + `PriceHistory` | Must |
| FR-56 | `gauge = smart_money` 행은 같은 모양으로 둔다(입력: 대량 체결 순매수 구간). 집계 착수는 Should | Should |
| FR-57 | `bucket` 경계(20 단위 5구간)는 **데이터**다. 바꾸면 전체 재집계한다 | Must |
| FR-58 | 수익률 필드는 **과거 분포**다. **예상 수익 · 목표가 컬럼을 만들지 않는다**(공통 기준 ④). 관찰 구간(D2)의 하단·중앙·상단 가격도 저장 컬럼이 아니라 요청 시 `PriceHistory` 에서 계산하고, 워커 스냅샷은 `payload` 에만 싣는다 | Must |
| FR-60 | **`symbol_judgment_snapshots.sample_origin`** (개정 2026-09-24, F009 슬라이스 0 C06). `live` · `backtest` · `synthetic` 중 하나 — `NOT NULL` · CHECK, **기본값 없음**(쓰는 쪽이 출처를 말한다). 실측 성적(게이트 · 적중률 · 실패사례 · 성적표)은 `live` 만 센다. 기존 행은 쓴 쪽으로 가른다 — 시드 표식(`reasons` 의 `seed:`) → `synthetic`, 나머지(워커) → `live`. 롤백은 열 삭제(행 손실 0) | Must |
| FR-59 | 보유 여부는 **기존 `PortfolioTransaction` → `PortfolioHolding`** 에서 온다. 원장 확장(결제일 · 환율)은 없다(ADR-002) | Must |

## 공유 — `IndicatorTrackRecord`

F004의 **3종 세트 렌더 게이트**(근거·적중률·실패사례) 중 실패사례가 이 모델에서 온다.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | `IndicatorTrackRecord`는 `DB-REQ-013`(F003)이 만든다. **F004는 읽기만** 한다 | Must |
| FR-41 | F004는 `indicator` 키로 조회한다. 코치가 쓰는 지표군과 `IndicatorTrackRecord.indicator`가 **매핑 가능해야 한다** | Must |
| FR-42 | 매핑이 없으면 실패사례가 없고 → **추천 카드가 렌더되지 않는다**(정상 동작) | Must |
| FR-61 | **`coach_recommendation_snapshots`** (F010 슬라이스 0, `20260928101000`). 저장 추천 불변 원장 — `user_id`(FK cascade) · `symbol` · `mode`(지금은 늘 `long_term`) · `action` · `signal_type`(`coach.<action>`) · `score` · `reasons` · `entry_price` · `judged_at` · `sample_origin`(CHECK live/backtest/synthetic, 기본값 없음) · 채점 4열(`exit_price` · `return_rate` · `outcome` · `evaluated_at`). 유니크 `(user_id, symbol, action, judged_at)` · 인덱스 `(user_id, signal_type, outcome, judged_at desc)` · `(evaluated_at, judged_at)`. `investment_insights.ai_coach` 의 upsert 는 그대로(현재 추천) — 이력은 이 표. 롤백 = DROP TABLE | Must |
| FR-62 | **`judgment_ledger`** (F010 슬라이스 1, `20260929100000`). 예측 원장 — `symbol` · `mode`(CHECK scalp/long_term) · `as_of_date`(date, UTC) · `decided_at` · `rule_version` · `score` · `action` · `components`(jsonb, 항목별 기여) · `materials`(jsonb, 재료 값 + 발생 시각) · `missing_data`(text[]) · `regime` · `entry_price` · `entry_observed_at` · `sample_origin`(CHECK). 유니크 `(symbol, mode, as_of_date)` · 인덱스 `(as_of_date)`. **판정 열 없음**(라벨은 읽는 쪽). **UPDATE 트리거가 막는다**(불변). 쓰기 `salt-server` · 읽기 `salt-forecast`. 롤백 = DROP TRIGGER · FUNCTION · TABLE. **v2(11-10):** 국내 단타 행도 받는다(국내 단타 개방 · 다음 거래일 종가 채점 · `rule-ic-kr@1`) — 스키마 변경 여부는 `DB-REQ-043` (`FEATURE-017` v2) | Must |
| FR-63 | **`whale_transactions.traded_at` · `sequential_id`** (F010 슬라이스 1, `20260929100100`). 발생 시각 · 거래소 체결 id. 유니크 `(symbol, sequential_id)` — 기존 행은 둘 다 NULL(Postgres 유니크가 NULL 을 서로 다르게 본다 → 충돌 없음). 인덱스 `(symbol, traded_at)`. `detected_at` 은 도착 시각으로 뜻을 좁힌다. 롤백 = DROP INDEX 둘 · COLUMN 둘 | Must |
| FR-64 | **`symbol_judgment_snapshots.rule_version`** (F010 슬라이스 1, `20260929100200`). NOT NULL, 기본값 없음(기존 행은 `mode-decision@1` 로 채운 뒤 기본값 제거). 성적 인덱스를 `(rule_version, signal_type, outcome, judged_at desc)` 로 교체. 롤백 = 인덱스 원복 · DROP COLUMN(행 손실 0) | Must |
| FR-65 | **`llm_call_logs`** (F010 슬라이스 7, `20261007015852_llm_call_logs`, Prisma `LlmCallLog`). LLM 시도 원장 — `id`(text, uuid) · `user_id`(nullable, FK `users` **ON DELETE SET NULL** — 사용자가 지워져도 전체 상한은 계속 맞아야 해서 행은 남긴다) · `purpose` · `model` · `requested_at` · `duration_ms` · `ok` · `error_code` · `prompt_tokens` · `output_tokens` · `total_tokens`. 인덱스 `(requested_at)` · `(user_id, requested_at)`. 프롬프트 · 응답 원문 열 없음. 추가만 · 롤백 = DROP TABLE. 보존 정책 없음(하루 ≤ 300행 — 기술부채) | Must |

## Acceptance Criteria

- [ ] `InvestmentInsight`에 `kind`·`action`·`score`·`signalType`·`generatedAt` 컬럼이 있다
- [ ] 인덱스 3개가 추가되어 있다
- [ ] `payload`가 표시용으로만 남고 조건 쿼리가 0건이다 (신규 코드)
- [ ] `CoachFeedback`이 있고 `@@unique([userId, insightId])`가 있다
- [ ] `CoachFeedback.reasonCode`가 4종 코드다
- [ ] `@@index([helpful, reasonCode])`가 있다
- [ ] **`CoachGenerationLog`가 있고 쿨다운 판정에 쓸 수 있다**
- [ ] `CoachGenerationLog.llmSource`가 있다
- [ ] `UserInvestmentProfile`에 `defaultMode`·`notificationLevel`이 있다
- [ ] `InsightType`에 `smart_buy_zone`이 **남아 있고**, 새 규칙(D2)의 구간 스냅샷이 이 타입으로 기록된다 (개정 2026-09-21)
- [ ] `kind` 에 `symbol_judgment` 가 있고 `mode` 컬럼 · `(symbol, kind, mode, createdAt DESC)` 인덱스가 있다
- [ ] 종목 판단 스냅샷이 `dedupeKey` 로 시간 버킷당 1건이다
- [ ] **신규 코드에서 `confidence` 를 읽거나 쓰는 곳이 0건이다** (기존 컬럼은 남아 있다)
- [ ] `GaugeTrackRecord` 가 있고 `@@unique([symbol, gauge, bucket, horizonDays])` 가 있다
- [ ] 예상 수익 · 목표가 · 관찰 구간 가격 컬럼이 0건이다
- [ ] `UserInvestmentProfile` 에 `benchmarkSymbol` 이 추가되지 않았다 (ADR-002)
- [ ] `IndicatorTrackRecord`가 F003에서 정의되고 F004가 중복 생성하지 않았다
- [ ] `npx prisma validate` · `generate` · `npm run build` 통과

## Dependencies

- **선행:** `DB-REQ-001`(`AssetType` — Q2 로 유지 여부 열림) · **`DB-REQ-013`(`IndicatorTrackRecord`)**. ~~`DB-REQ-005`(`benchmarkSymbol`)~~ — ADR-002 로 삭제
- **짝:** `DB-REQ-018`(불변식) · `019`(마이그레이션) · `020`(성능)
- **소비:** `SRV-REQ-024`~`027`(F004 서버)

## Open Questions

- **`signalType`을 무엇으로 채울지.** `ai-coach-score.engine.ts`의 점수 스케일과 `signal-performance`의 그룹 키가 **1:1로 매핑되는지 확인이 필요하다**(FEATURE-004 Open Question). 매핑이 안 되면 카드가 어떤 성적표를 붙일지 결정할 수 없다 — **F004 착수 전 선결.**
- `InvestmentInsight.payload`의 기존 구조가 문서화되어 있지 않다. 승격할 필드를 정하려면 실제 payload 샘플을 봐야 한다.
- ~~`defaultMode`·`notificationLevel`을 컬럼으로 추가할지 UI에서 숨길지.~~ **닫힘 2026-09-21** — 노출 + 컬럼 추가(B16).
- ~~**Q3**~~ — 2026-09-21 D12 로 닫힘. 미보유 개별 주식은 구간 스냅샷을 남기지 않는다.
- 종목 판단 스냅샷의 시간 버킷(1시간 · 1일). 버킷이 짧으면 표본이 빨리 쌓이지만 서로 독립이 아니다 — 성적표가 부풀려진다.
- `GaugeTrackRecord` 를 종목별로 둘지 시장 전체로 둘지. 종목별이면 표본이 부족한 종목이 많다(표본 < 20 → 배지).

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` 반영. FR-30 개정(D2 — `smart_buy_zone` 생성 중단 철회, 새 규칙 서버 계산) · FR-32 무효화 · FR-20 개정(B16 노출 확정, `benchmarkSymbol` 제거 — ADR-002). 신규 FR-50~59(종목 판단 스냅샷 `symbol_judgment` · `mode` 컬럼 · 신뢰도 미사용(D3) · `GaugeTrackRecord`(B9) · 예측 컬럼 금지) |
| 2026-09-21 | `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` D11 ~ D13 반영. Q3 닫음(D12) |
| 2026-09-21 | **FR-50~53 을 다르게 구현.** 종목 판단 스냅샷을 `InvestmentInsight.kind = symbol_judgment` 가 아니라 **별도 테이블 `SymbolJudgmentSnapshot`** 에 둔다 — `InvestmentInsight` 는 피드 · 대시보드 · 점수 계산이 타입 필터 없이 읽어 스냅샷이 섞이면 거기로 쏟아진다. 판단이 사용자와 무관하므로 사용자 열도 없다(종목 · 모드당 한 벌, B39 — 관찰 기간당 1행). 인덱스: `(symbol, mode, judged_at)` 유니크 · `(signal_type, outcome, judged_at DESC)` · `(evaluated_at, judged_at)`. FR-1~8 승격 컬럼 · FR-54 · FR-55(게이지) 는 남음 |
| 2026-09-21 | **FR-55 · FR-57 구현.** `GaugeTrackRecord`(`gauge_track_records`) — 스펙 모양 그대로, 수익률은 비율. 집계는 `market` 공개 API(심리 하루 1표본 · 진입/청산 = 그 시각 이후 첫 일봉 종가), 저장은 `coach`. 일 1회 워커가 통째로 다시 쓰고 이번에 없는 줄은 지운다. 남음: FR-56(`smart_money`, Should) |
| 2026-09-23 | **FR-13~15 · FR-20~22 구현 (슬라이스 13).** `coach_generation_logs`(`20260923042043`) · 프로필 열 2(`20260923041818`). **다르게 1건**: `status` 에 `running` 을 더했다 — 생성이 비동기(202)라 받는 순간 행이 있어야 다음 요청의 쿨다운이 진행 중 생성을 본다. 근거 `reports/checklists/DB-REQ-017.md` |
| 2026-09-24 | **FR-60 신설 · 구현 (F009 슬라이스 0 C06).** `20260924130000_judgment_sample_origin`. 로컬 적용: 256행 → `synthetic` 240 · `live` 16(합 불변), CHECK 가 `'guess'` 거부. 근거 `reports/checklists/DB-REQ-017.md` |
| 2026-09-28 | **FR-61 신설 · 구현 (F010 슬라이스 0).** `20260928101000_coach_recommendation_snapshots`(추가만). 같은 브랜치 `20260928100100_judgment_outcome_after_cost` 는 `symbol_judgment_snapshots.outcome` 재판정(수수료 0.1% 경계, `SRV-REQ-024` FR-174) — 로컬 live 18행 결과 변화 없음 |
| 2026-09-29 | **FR-62 · 63 신설 · 구현 (F010 슬라이스 1).** `20260929100000_judgment_ledger_rule_ic` · `20260929100100_whale_trade_time`(추가만). 로컬 적용 · 원장 첫 발행 6행(추적 3 × 모드 2, 결측 0) · 체결 id 로 대형 체결 저장. 근거 `reports/checklists/DB-REQ-017.md` |
| 2026-09-29 | **FR-64 신설 · 구현.** `20260929100200_judgment_rule_version`. 로컬 기존 267행(live 27 · synthetic 240) → `@1`, v2 live 6행이 v1 관찰 기간을 기다리지 않고 바로 쓰였다 |
| 2026-10-07 | **FR-65 신설 · 구현 (F010 슬라이스 7).** `20261007015852_llm_call_logs`(추가만, `bc2fbf0`). 로컬 적용. Prisma 가 함께 생성한 RenameIndex 2건(이전 마이그레이션 드리프트 — `coach_recommendation_snapshots` 인덱스 이름 63자 잘림)은 목적 하나 원칙으로 뺐다 — 드리프트는 남아 다음 `migrate dev` 가 또 만든다. 근거 `reports/checklists/DB-REQ-017.md` |
| 2026-10-26 | F011 슬라이스 7b — `symbol_judgment_snapshots` 에 `sample_origin='backtest'` 첫 쓰기(국내 51,305행, `scripts/backtest-kr-judgments.ts`, 사전등록 `kr-judgment-backtest@1`). DDL 없음 — FR-60 출처 값 그대로. 워커 경로(`lastJudgedAt` · `listPending`)는 `live` 만이라 영향 없음 |
| 2026-10-29 | 전수 조사 — 현재와 다른 서술 정정(머리 블록). 본문은 당시 기록으로 둠 |
| 2026-10-30 | 파일만 걸침 — `env.ts` 에 `TRACKED_ASSET_LIMIT` 추가. 합성 표본 설정 무변경 — F000 종목 검색 슬라이스. 루트 `requirements/specs/in-progress/F000-asset-search-slice.md` |
| 2026-10-30 | F004 슬라이스 18 — **변경 없음.** FR-20 `default_mode` 를 웹 설정 화면이 쓴다. `notification_level` 은 열은 있지만 읽는 코드가 없어 화면에 두지 않았다(`FE-REQ-026` FR-80 개정) |
| 2026-11-02 | 파일만 걸침 — `coach/domain/model.ts`(이 REQ 가 머리 주석 주인) `CoachSymbolArticle` 에 `url` · `publishedAt`(뉴스 표 기존 열 — DDL 0). 루트 `requirements/specs/done/F008-explain-citations-slice.md` |
| 2026-11-02 | `llm_call_logs` 에 `provider TEXT NOT NULL DEFAULT 'gemini'` · `dropped_sentences INT NULL`(마이그레이션 `20261102120000_llm_call_provider`, 추가만 · 되돌리기 SQL 은 파일 머리). 기존 행은 전부 Gemini 시도. 근거 `SRV-REQ-050` FR-8 · 9. 루트 `requirements/specs/done/F008-explain-llm-routing-slice.md` |
| 2026-11-02 | MONEY-F1(`FE-REQ-053`) 에서 이 REQ 가 걸렸다 — 코치 프로필 첫 저장 경합 500 → 행 보장(ON CONFLICT DO NOTHING) 뒤 update(`b9a06a08`). 파일 1개(경로 이동 내용 무변경 0 · 수정 1 · 추가 0 · 삭제 0). 화면 · 동작이 바뀐 몫은 위 커밋 설명대로 |
| 2026-11-06 | 서버 S2c(notification, 루트 `requirements/specs/done/MONEY-S2c-notification-slice.md`): 파일만 걸침 — coach 판단 변화 통보(`GenerateCoachRecommendation`)가 이벤트 하나로 · 2시간 억제는 받는 쪽 |
| 2026-11-06 | 서버 S2c 확인 2회차 — 판단 변화 이벤트 실패 격리(루트 `requirements/reports/checklists/MONEY-S2c-notification.md`) |
| 2026-11-09 | **판단 상세 504 고침**(사용자 "504 고쳐야지") — 성적 집계(`summarize`)가 쿼리 여섯을 나란히 · 요청당 3~4번 = 집계 18~24개, 풀 조건(`starts_with`)이 인덱스를 못 타 백테스트 5만 행을 매번 훑었다. 한 쿼리(`FILTER`) · 풀 인덱스 `symbol_judgment_snapshots_pool_idx(sample_origin, signal_type)` + 접두 `LIKE`(DB 정렬 `C`) · 5분 들고 있기(채점 쓰기 뒤 버림). 결과 18건 글자 대조 같음 |
| 2026-11-09 | **504 3회차 — 진짜 원인**: 지표 갱신(2분마다 · API 프로세스 안)이 358종목 × 약 1,400봉 = 49만 행을 Prisma Decimal 로 해석해 CPU 140~320% · 이벤트 루프 지연 270ms. `recentCandles` 를 `::float8` 원시 쿼리로(49만 행 숫자 같음). 같은 종류(큰 결과를 Node 로 — 메모리 `distinct`) 넷 더: `findLatestMany`(지표) · `latestCloses` · 옛 `generateSmartBuyZone`(+ N+1) · 옛 `generateWhaleSignals`(19만 행) → `LATERAL … LIMIT`. 달력 역산(`daysFromDailyCandles`)은 유니버스로(67만 행 순차 → 인덱스). 기동 때 연결 풀 채우기 · 워커는 listen 뒤 15초. BFF 460회 504 0 |
| 2026-11-10 | **504 4회차 — 연결 풀 대기**(`c602e97c`): 장중 `/api/ai-coach` p99 719ms · 최대 865ms(11-06 · 09 · 10 장중 BFF 504). CPU 95% 놂 · 느린 요청의 읽기 다섯이 **같은 순간에 끝남** → 풀(17) 대기. 그 순간 연결 12개가 행마다 `UPDATE market_assets`. 같은 꼴 셋 고침: 시세 300종목(`applyQuotes`) · 캔들 upsert → 한 문장, 지표 갱신 동시 20 → 4(350종목 2.9s). 기계 검사 `noParallelRowWrites.test.ts`. 후 220회 p99 70ms · 최대 119ms · 250ms 넘음 0 |
| 2026-11-10 | **504 5회차 — 봉 다시 쓰기 · 막힌 VACUUM**(F018 실화면에서 봄 — 국내 판단 상세 p90 9.3s · 최대 16.6s, 코인 최대 7.6s): 5분마다 코인 300여 종목 × (5분봉 288 + 일봉 120)을 **바뀌지 않은 행까지** `ON CONFLICT DO UPDATE` 로 다시 씀 · 동시 10 — 문장 하나 7~8초. 표 누적 갱신 3억 1,500만 · 죽은 행 510만(산 행 365만). 죽은 행이 안 지워진 이유 = 예측 뉴스 작업이 advisory lock 트랜잭션을 8시간 열어 둠(`idle in transaction` — DB 전체 VACUUM 정지). 고침: `price_history` upsert 다섯 곳 `WHERE … IS DISTINCT FROM`(기계 검사 `noBlindCandleRewrite.test.ts`) · 캔들 동시 10 → 4 · 자동 청소 문턱 2%(마이그레이션 `20261110130000_price_history_autovacuum`) · 예측 `advisory_lock` 락 직후 커밋 + 작업 시간 상한(`FC-REQ-018`). 후 코인 최대 128ms · 캔들 쓰기 표본 2,189 → 6. ~~국내는 죽은 행이 남아 최대 4s~~ 13:19 매달린 작업 종료(사용자 승인) · VACUUM 죽은 행 473만 지움 → 국내 p90 133 · 최대 432ms(서버) · BFF 경유 504 0(국내 최대 176ms) |
| 2026-11-10 | v2 대체 표시 — FR-62 메모(국내 단타 행) (`FEATURE-017` v2 · `ADR-010` v2) |
| 2026-11-10 | F017 v2 단계 1(`d6105374`) — 스키마 · 원장 무변경. 판단 게이트 코드(`symbolJudgment.ts`)가 이 REQ 를 가리켜 기록만. 국내 단타 원장 행(FR-62)은 1b |
| 2026-11-10 밤(1b) | FR-62 국내 단타 원장 행이 생김(`326a0553` — 11-10 16:54 첫 50건) · 출처 열 값 넓힘(`backtest_full` · `backtest_price_only` · `backtest_seen`, 마이그레이션 주인 `DB-REQ-043` FR-6). 표 구조 무변경 |
| 2026-11-10 밤(1b 확인 2회차) | **504 6회차 — 1b 가 만든 회귀**: 과거 검산 10만 행 뒤 `recentCases` 가 캐시 없이 3만 6천 행 정렬(103ms × 국내 두 모드) · 집계 캐시 끝날 때마다 차가운 회차 → BFF 504 넷(17:13 · 17:28~29). 인덱스 `symbol_judgment_snapshots_recent_cases_idx`(마이그레이션 `20261110210000`, 0.11ms) · 과거 검산 집계 6시간(`a7e63e9d`). 후 BFF 150종목 차가운 150/150 200 · p95 55ms · 새 504 0 |
| 2026-11-10 밤(FR-61) | `judgment_ledger.asset_class` 추가(마이그레이션 `20261110220000` — 불변 트리거 안 돎 · 기존 178행 crypto · CHECK 두 값 · 기본값 지움, `c8de7501`) |
| 2026-11-11 | `feat/f017-s1c-collection`: `app.ts` 워커 시작에 깸 감시(`SRV-REQ-057` FR-6) — 지표 갱신을 깸 구독 맨 뒤에 한 번. 풀 규칙(종목 동시 4 · 행 쓰기 한 문장) 그대로 — 새 쓰기 둘(채운 위치 · 스냅샷)도 한 문장 |
| 2026-11-11 | `feat/f017-s2-checks-plain-line`: `coach/domain/model.ts` `CoachQuote` 에 선택 필드 `openPrice?`(국내 시가 — 점검 시가 갭 조건 K3). 표 · 열 변경 0. 주인 REQ 는 `DB-REQ-043` · 서버 `SRV-REQ-053` · 예측 `FC-REQ-028` |

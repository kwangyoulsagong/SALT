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
  status      String                          // "succeeded" | "failed" | "cooldown_rejected"
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
  benchmarkSymbol   String  @default("KRW-BTC") @map("benchmark_symbol")   // DB-REQ-005 에서 추가
}
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `defaultMode`·`notificationLevel` 컬럼을 추가한다. **Swagger가 이미 계약으로 노출하고 있으므로 컬럼 추가가 맞다**(FEATURE-004는 "UI 숨김"도 대안으로 뒀으나, 계약이 이미 나가 있으면 컬럼이 낫다) | Must |
| FR-21 | 둘 다 nullable이다. 기존 row에 값이 없다 | Must |
| FR-22 | 값 검증은 서비스 레이어가 한다. DB에 CHECK를 걸지 않는다 — 값 목록이 바뀔 수 있다 | Should |

## Schema — `InsightType` 정리

현재 `enum InsightType { ai_coach, smart_buy_zone, behavior_analysis, risk_alert }`.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | FEATURE-004는 **3종 유지**(`ai_coach`·`behavior_analysis`·`risk_alert`)를 명시한다. `smart_buy_zone`은 **enum에 남기고 생성만 중단**한다 | Must |
| FR-31 | enum 값 제거는 Postgres에서 타입 교체다. **기존 row가 있으면 제거하지 않는다** | Must |
| FR-32 | `smart_buy_zone` row가 0건이면 별도 릴리스에서 제거를 검토한다 | Should |

## 공유 — `IndicatorTrackRecord`

F004의 **3종 세트 렌더 게이트**(근거·적중률·실패사례) 중 실패사례가 이 모델에서 온다.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | `IndicatorTrackRecord`는 `DB-REQ-013`(F003)이 만든다. **F004는 읽기만** 한다 | Must |
| FR-41 | F004는 `indicator` 키로 조회한다. 코치가 쓰는 지표군과 `IndicatorTrackRecord.indicator`가 **매핑 가능해야 한다** | Must |
| FR-42 | 매핑이 없으면 실패사례가 없고 → **추천 카드가 렌더되지 않는다**(정상 동작) | Must |

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
- [ ] `InsightType`에 `smart_buy_zone`이 **남아 있다**(제거하지 않음)
- [ ] `IndicatorTrackRecord`가 F003에서 정의되고 F004가 중복 생성하지 않았다
- [ ] `npx prisma validate` · `generate` · `npm run build` 통과

## Dependencies

- **선행:** `DB-REQ-001`(`AssetType`) · `DB-REQ-005`(`benchmarkSymbol`) · **`DB-REQ-013`(`IndicatorTrackRecord`)**
- **짝:** `DB-REQ-018`(불변식) · `019`(마이그레이션) · `020`(성능)
- **소비:** `SRV-REQ-024`~`027`(F004 서버)

## Open Questions

- **`signalType`을 무엇으로 채울지.** `ai-coach-score.engine.ts`의 점수 스케일과 `signal-performance`의 그룹 키가 **1:1로 매핑되는지 확인이 필요하다**(FEATURE-004 Open Question). 매핑이 안 되면 카드가 어떤 성적표를 붙일지 결정할 수 없다 — **F004 착수 전 선결.**
- `InvestmentInsight.payload`의 기존 구조가 문서화되어 있지 않다. 승격할 필드를 정하려면 실제 payload 샘플을 봐야 한다.
- `defaultMode`·`notificationLevel`을 컬럼으로 추가할지 UI에서 숨길지. **Swagger가 이미 계약으로 노출**하고 있어 컬럼이 낫지만, 그 값을 실제로 쓰는 로직이 있는지 확인 필요.

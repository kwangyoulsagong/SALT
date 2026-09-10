---
id: DB-REQ-021
feature: F006
area: db
kind: SCHEMA
title: "F006 코치 대화 & 3탭 IA — 스키마 정의 (대화 · 메시지 · 패널 배치)"
priority: critical
labels: [db, prisma, schema, conversation, sse, layout]
created: 2026-09-09
source: pm/requirements/specs/in-progress/FEATURE-006-coach-conversation-ia.md
---

## Summary

**대화가 제품의 핵심이 된다**(2026-09-09 결정). 그 대화를 저장할 모델이 필요하다. 그리고 PC 이동식 격자의 배치를 사용자별로 저장한다.

홈 5블록은 **조립만** 하므로 신규 모델이 없다 — 각 기능의 스냅샷을 읽는다.

## Schema — 대화

```prisma
model CoachConversation {
  id            String    @id @default(uuid())
  userId        String    @map("user_id")
  title         String?                                  // 첫 메시지에서 생성. null 허용
  lastMessageAt DateTime  @map("last_message_at")
  messageCount  Int       @default(0) @map("message_count")
  createdAt     DateTime  @default(now()) @map("created_at")
  archivedAt    DateTime? @map("archived_at")

  user     User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages CoachMessage[]

  @@index([userId, lastMessageAt(sort: Desc)])
  @@map("coach_conversations")
}

model CoachMessage {
  id             String   @id @default(uuid())
  conversationId String   @map("conversation_id")
  userId         String   @map("user_id")

  role           String                                  // "user" | "assistant"
  content        String   @db.Text
  status         String   @default("complete")           // "streaming" | "complete" | "failed"

  cardPayload    Json?    @map("card_payload")           // 추천 카드 (완성 객체). delta 로 흘리지 않는다
  insightId      String?  @map("insight_id")             // 카드가 참조하는 insight
  explanationSource String? @map("explanation_source")   // "llm" | "rule"

  tokenCount     Int?     @map("token_count")
  errorCode      String?  @map("error_code")

  createdAt      DateTime @default(now()) @map("created_at")
  completedAt    DateTime? @map("completed_at")

  conversation CoachConversation  @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  user         User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  insight      InvestmentInsight? @relation(fields: [insightId], references: [id], onDelete: SetNull)

  @@index([conversationId, createdAt(sort: Desc)])
  @@index([userId, createdAt(sort: Desc)])
  @@map("coach_messages")
}
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | `CoachConversation`·`CoachMessage`를 신설한다 | Must |
| FR-2 | **역순 커서 페이징**을 위해 `@@index([conversationId, createdAt DESC])`를 둔다. 대화는 최신부터 읽는다 | Must |
| FR-3 | `status`가 `streaming`인 메시지가 존재할 수 있다. **재연결 시 그것을 이어 보낸다**(멱등의 근거) | Must |
| FR-4 | **`cardPayload`는 완성 객체**다. `delta`로 흘리지 않으므로 부분 상태가 저장되지 않는다 — 3종 세트 게이트가 부분 상태에서 판정되면 안 된다 | Must |
| FR-5 | `insightId`로 카드가 참조하는 추천을 연결한다. `onDelete: SetNull` — insight가 정리되어도 대화는 남는다 | Must |
| FR-6 | `explanationSource`를 둔다. 대화 응답이 LLM인지 규칙인지 화면이 배지로 표시한다 | Must |
| FR-7 | `tokenCount`를 둔다. **비용 관측**의 근거다 | Must |
| FR-8 | `errorCode`를 둔다. 실패한 응답도 대화에 남는다 | Must |
| FR-9 | **프롬프트를 저장하지 않는다.** `content`는 사용자 메시지와 생성된 답변뿐이다 | Must |
| FR-10 | `title`은 nullable이다. 첫 메시지에서 생성하되 실패해도 대화가 성립한다 | Must |
| FR-11 | `archivedAt`으로 보존 정책을 지원한다. 삭제하지 않고 아카이브 | Should |
| FR-12 | `messageCount`를 비정규화한다. 목록에서 `COUNT(*)`를 피한다 | Must |

## Schema — PC 패널 배치

2026-09-09 결정: **PC는 탭이 아니라 `MovableGrid`(이진 트리 분할)** 로 여러 패널을 동시에 본다.

```prisma
model PanelLayout {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  surface   String                                    // "pc" — 지금은 하나
  treeJson  Json     @map("tree_json")                // layoutTree 이진 트리 스냅샷
  updatedAt DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, surface])
  @@map("panel_layouts")
}
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `PanelLayout`을 신설한다. **사용자가 바꾼 배치를 저장**한다 | Should |
| FR-21 | `treeJson`은 **표시용 스냅샷**이다. 쿼리 조건으로 쓰지 않는다(`DB-REQ-002` FR-30 허용) | Must |
| FR-22 | `@@unique([userId, surface])`. 사용자당 서피스당 1건 | Must |
| FR-23 | 저장 실패해도 **기본 배치로 동작**해야 한다. 배치 저장은 편의 기능이다 | Must |
| FR-24 | 서버가 트리 구조를 **검증하지 않는다.** 프론트 `layoutTree` 순수 모듈이 소유한 형식이다. 다만 크기 상한(예: 16KB)을 둔다 | Must |

## 홈 5블록 — 신규 모델 없음

| 블록 | 소스 |
|---|---|
| 총자산 | `PortfolioHolding` + `FxRate`(현재 환율) |
| 이번 주 적립 | `WeeklyPlanExecution`(F003) |
| AI 추천 | `InvestmentInsight`(F004) |
| 세금 D-Day | `TaxLawConfig` + `SettlementCalendar`(F002) |
| 청구서 한 줄 | `CounterfactualSnapshot`(F001) |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 홈은 **조립만** 한다. 신규 모델을 만들지 않는다 | Must |
| FR-31 | 홈 응답을 **캐시하지 않는다.** 매번 달라지는 것이 이 화면의 목적이다 | Must |
| FR-32 | 총자산의 환율은 **현재 환율**(`FxRate` 최신)이다. 세금용 결제일 환율과 **다른 `kind`** 를 쓴다 | Must |
| FR-33 | `FxRate.kind`에 `current`를 추가한다. 기존 `settlement_base`와 구분 | Must |

## 알림 — F000에서 정의됨

알림 2종(`tax_deadline`·`signal_update`)은 `InvestmentNotification`으로 이미 있다. F006은 **읽기만** 한다.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | `InvestmentNotification`을 그대로 쓴다. 신규 모델 없음 | Must |
| FR-41 | 홈 하단 알림 목록이 `@@index([userId, isRead])`를 탄다 | Must |

## Acceptance Criteria

- [ ] `CoachConversation`·`CoachMessage`가 있다
- [ ] `@@index([conversationId, createdAt DESC])`가 있다
- [ ] `status`에 `streaming`이 허용된다
- [ ] `cardPayload`가 `Json`이고 완성 객체를 담는다
- [ ] `insightId`가 `onDelete: SetNull`이다
- [ ] `explanationSource`·`tokenCount`·`errorCode`가 있다
- [ ] **프롬프트를 저장하는 컬럼이 0건이다**
- [ ] `messageCount`가 비정규화되어 있다
- [ ] `PanelLayout`이 있고 `@@unique([userId, surface])`가 있다
- [ ] `treeJson` 크기 상한이 있다
- [ ] 홈용 신규 모델이 0건이다
- [ ] `FxRate.kind`에 `current`가 추가되어 `settlement_base`와 구분된다
- [ ] `npx prisma validate` · `generate` · `npm run build` 통과

## Dependencies

- **선행:** `DB-REQ-005`(`FxRate`) · `DB-REQ-017`(`InvestmentInsight` 확장) · `DB-REQ-001`
- **짝:** `DB-REQ-022`(불변식) · `023`(마이그레이션) · `024`(성능)
- **소비:** `SRV-REQ-028`~`031`(F006 서버)

## Open Questions

- 대화 보존 기간. 무한히 쌓이면 프롬프트 컨텍스트 비용과 모바일 메모리 문제가 된다 → **아카이브 정책 필요**(FR-11).
- `cardPayload`를 `InvestmentInsight`에서 조회하지 않고 메시지에 복사하는 이유: **대화는 그 시점의 카드를 보여줘야 한다.** insight가 갱신되면 과거 대화의 카드가 바뀌면 안 된다 → 복사가 맞다. 다만 중복 저장이다.
- `PanelLayout`을 서버에 둘지 브라우저 `localStorage`에 둘지. **기기 간 동기화가 필요하면 서버**이지만, PC 한 대면 로컬이 충분하다 → Should로 둔 이유.
- `title` 생성을 LLM으로 할지 첫 메시지 앞부분을 쓸지. LLM이면 비용이 든다.

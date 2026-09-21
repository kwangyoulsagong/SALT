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

> **2026-09-21 개정.** `ADR-002`로 F001 · F002가 빠졌다 — 홈 **3블록**(세금 D-Day · 청구서 소스 `TaxLawConfig` · `SettlementCalendar` · `CounterfactualSnapshot` 삭제), 알림 **1종**, `FxRate`의 출처였던 `DB-REQ-005` 삭제. 포지션 세그먼트 · 알림 설정 · 온보딩 2단계용 컬럼 2개를 추가했다(§포지션 · 알림 설정 · 온보딩). 근거: 스토리보드 갭 감사 D5 · D6 · D9 · B12 · B13 · B14.

## Summary

**대화가 제품의 핵심이 된다**(2026-09-09 결정). 그 대화를 저장할 모델이 필요하다. 그리고 PC 이동식 격자의 배치를 사용자별로 저장한다.

홈 3블록은 **조립만** 하므로 신규 모델이 없다 — 각 기능의 스냅샷을 읽는다. *(2026-09-21 개정 — 5블록 → 3블록, D6)*

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

## 홈 3블록 — 신규 모델 없음

| 블록 | 소스 |
|---|---|
| 총자산 | `PortfolioHolding`(원화 합산). 비원화 보유가 생기면 현재 환율 — 소스 미정(Q2) |
| 이번 주 적립 | `WeeklyPlanExecution`(F003) |
| AI 추천 | `InvestmentInsight`(F004) |
| ~~세금 D-Day~~ | **삭제 2026-09-21** (ADR-002) |
| ~~청구서 한 줄~~ | **삭제 2026-09-21** (ADR-002) |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 홈은 **조립만** 한다. 신규 모델을 만들지 않는다 | Must |
| FR-31 | 홈 응답을 **캐시하지 않는다.** 매번 달라지는 것이 이 화면의 목적이다 | Must |
| FR-32 | 총자산은 **원화 합산**이다. 비원화 보유가 있을 때만 **현재 환율**이 필요하다. **개정 2026-09-21** — `FxRate` 모델을 정의하던 `DB-REQ-005`가 ADR-002로 삭제됐다. F006은 `FxRate`를 전제하지 않는다. 환율 소스는 자산군 3종 유지 여부(감사 Q2)가 정해진 뒤 정한다 | Must |
| FR-33 | ~~`FxRate.kind`에 `current`를 추가한다~~ **보류 2026-09-21** — `settlement_base`(세금 기준)가 사라져 구분할 대상이 없다. Q2 결정 후 환율 모델을 새로 정의한다 | — |

## 알림 — F000에서 정의됨

알림은 **1종(`signal_update` — 지표 · 추천 갱신)** 이다(D5). `InvestmentNotification`으로 이미 있다. *(2026-09-21 개정 — `tax_deadline`은 ADR-002로 삭제. "읽기만"도 개정: 읽음 · 모두 읽음을 쓴다 — 서버 경로가 이미 있다)*

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | `InvestmentNotification`을 그대로 쓴다. 신규 모델 없음 | Must |
| FR-41 | 알림 목록 · **안 읽은 수(헤더 벨)** 가 `@@index([userId, isRead])`를 탄다. **개정 2026-09-21** — 홈 하단 알림 목록은 없다(D6) | Must |
| FR-42 | 새로 만드는 알림 `type`은 **`signal_update` 하나**다. 기존 다른 타입 행은 **지우지 않고** 목록 · 안 읽은 수에서 제외한다 | Must |
| FR-43 | 같은 원인(추천 · 밴드 갱신 1건)으로 알림이 두 번 생기지 않게 **`dedupeKey String?`** 을 추가하고 `@@unique([userId, type, dedupeKey])`를 둔다. 기존 행은 `null` | Should |

## 포지션 · 알림 설정 · 온보딩 (2026-09-21 추가)

보유 기록은 **기존 `PortfolioTransaction` 그대로**다(ADR-002 §3). 원장 확장 필드(결제일 · 거래 환율 · 신고 잔고 · 수기 현재가)를 **추가하지 않는다.**

```prisma
model User {
  // ... 기존 필드
  alertsEnabled         Boolean   @default(true) @map("alerts_enabled")          // 설정 ④ 알림 켜기/끄기
  firstHoldingSkippedAt DateTime? @map("first_holding_skipped_at")             // 온보딩 2단계 건너뛰기
}
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | **포지션 세그먼트용 신규 모델이 없다.** Hero · 평가금 흐름 · MDD · 리스크 레이더는 `PortfolioTransaction` · `PortfolioHolding` · `PriceHistory` · `NewsArticle`을 읽어 **서버가 계산**한다 **(기본안 — 감사 문서 B13)** | Must |
| FR-51 | `PortfolioTransaction`에 결제일 · 환율 · 반사실 컬럼을 **추가하지 않는다** (ADR-002) | Must |
| FR-52 | 거래 수정에 `transactionDate`를 포함한다. **스키마 변경 없음** — 컬럼은 이미 있다 **(기본안 — 감사 문서 B14)** | Must |
| FR-53 | `User.alertsEnabled`(기본 `true`)를 추가한다. `false`면 새 알림을 만들지 않는다 (D9 설정 ④) | Must |
| FR-54 | `User.firstHoldingSkippedAt`을 추가한다. 온보딩 2단계 완료 = `PortfolioTransaction` 1건 이상 **또는** 이 값이 있음 **(기본안 — 감사 문서 B12)** | Must |
| FR-55 | 리스크 레이더 **축 정의 · 상한은 DB에 두지 않는다** — 서버 설정 파일(환경별)이다. 사용자별 값이 아니다 **(기본안 — 감사 문서 B13)** | Must |
| FR-56 | 성과 계열 · MDD · 레이더 결과를 **저장하지 않는다.** 조회 시 계산한다. 느리면 `DB-REQ-024` 측정 후 스냅샷을 검토한다 | Must |
| FR-57 | 설정의 `defaultMode` · `notificationLevel` 컬럼은 **F004 DB REQ가 추가**한다(B16). F006은 컬럼을 만들지 않고 읽기 · 쓰기 경로만 조립한다 | Must |
| FR-58 | 온보딩 `link_account` 판정에 쓰던 원장 연결 여부(`ledger`)를 **읽지 않는다.** 원장 모델이 없다 | Must |

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
- [ ] ~~`FxRate.kind`에 `current`가 추가되어 `settlement_base`와 구분된다~~ — 보류(FR-33)
- [ ] `npx prisma validate` · `generate` · `npm run build` 통과
- [ ] `User.alertsEnabled` · `User.firstHoldingSkippedAt`이 있다
- [ ] `PortfolioTransaction`에 결제일 · 환율 컬럼이 0건이다
- [ ] 포지션 · 레이더용 신규 모델이 0건이다
- [ ] 새로 생성되는 `InvestmentNotification.type`이 `signal_update`뿐이다
- [ ] 스키마에 `TaxLawConfig` · `SettlementCalendar` · `CounterfactualSnapshot` 참조가 0건이다

## Dependencies

- **선행:** `DB-REQ-017`(`InvestmentInsight` 확장) · `DB-REQ-001` · F004 DB REQ(`defaultMode` · `notificationLevel` 컬럼, B16). ~~`DB-REQ-005`(`FxRate`)~~ — ADR-002로 삭제
- **짝:** `DB-REQ-022`(불변식) · `023`(마이그레이션) · `024`(성능)
- **소비:** `SRV-REQ-028`~`031`(F006 서버)

## Open Questions

- 대화 보존 기간. 무한히 쌓이면 프롬프트 컨텍스트 비용과 모바일 메모리 문제가 된다 → **아카이브 정책 필요**(FR-11).
- `cardPayload`를 `InvestmentInsight`에서 조회하지 않고 메시지에 복사하는 이유: **대화는 그 시점의 카드를 보여줘야 한다.** insight가 갱신되면 과거 대화의 카드가 바뀌면 안 된다 → 복사가 맞다. 다만 중복 저장이다.
- `PanelLayout`을 서버에 둘지 브라우저 `localStorage`에 둘지. **기기 간 동기화가 필요하면 서버**이지만, PC 한 대면 로컬이 충분하다 → Should로 둔 이유.
- `title` 생성을 LLM으로 할지 첫 메시지 앞부분을 쓸지. LLM이면 비용이 든다.
- **환율 모델(FR-32 · 33).** 자산군 3종을 유지하면(감사 Q2) 비원화 보유의 현재 환율이 필요하다. 그때 `FxRate`를 **세금 기준 없이** 새로 정의한다.
- **`alertsEnabled`와 F004 `notificationLevel`이 겹치는가.** 합칠 수 있으면 `alertsEnabled`를 만들지 않는다 — F004와 함께 정한다.
- 리스크 레이더 뉴스 리스크 축이 `NewsArticle.sentiment`에 기대는데, 감정 값 채움률이 낮으면 축이 비어 보인다. 축별 `null` 허용이 필요할 수 있다.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | ADR-002 머리 배너. 개정: 홈 5블록 → 3블록(D6), FR-32(`FxRate` 전제 제거) · FR-33 보류 · FR-41 · 알림 1종(D5). 추가: FR-42~43(알림 타입 · 중복), FR-50~58(포지션 신규 모델 없음 B13 · 거래일 수정 B14 · `User.alertsEnabled` D9 · `User.firstHoldingSkippedAt` B12 · 레이더 설정값 · F004 컬럼 소유). 근거: `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` · `ADR-002` |

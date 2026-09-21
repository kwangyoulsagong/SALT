---
id: DB-REQ-024
feature: F006
area: db
kind: PERF
title: "F006 코치 대화 & 3탭 IA — DB 성능 정의 (대화 페이징 · 스트리밍 쓰기 · 홈 조립)"
priority: critical
labels: [db, performance, cursor-paging, streaming-write, home]
created: 2026-09-09
---

> **2026-09-21 개정.** `ADR-002` — 홈은 **3블록**이다(세금 D-Day · 청구서 소스 쿼리 삭제). 포지션 세그먼트(1년 성과 계열 · MDD · 리스크 레이더 · 거래 미리보기)와 알림 읽음의 예산 · 인덱스를 추가했다(§급소 3 · 4). 근거: 스토리보드 갭 감사 D5 · B13 · B14.

## Summary

F006의 DB 급소는 **스트리밍 중 부분 저장이 쓰기를 늘리는 것**, **홈 3블록이 스냅샷을 읽는 것**, 그리고 **포지션의 1년 평가금 계열이 `PriceHistory`를 넓게 읽는 것**이다. *(2026-09-21 개정)*

## 예산

| 작업 | 예산 | 비고 |
|---|---|---|
| 대화 목록 (최근 20) | **100ms** | 커서 |
| 메시지 목록 (역순 30) | **150ms** | 커서 |
| 메시지 생성 (사용자) | 50ms | |
| **스트리밍 부분 저장** | **20ms/회** | 2초 또는 500자마다 |
| 메시지 완료 저장 | 50ms | |
| 카드 저장 | 50ms | 완성 객체 1회 |
| 재연결 조회 | **50ms** | `messageId` PK |
| 홈 3블록 조립 | **400ms** | 3개 병렬 *(개정 2026-09-21)* |
| 총자산 (보유 + 환율) | 100ms | |
| 이번 주 적립 | 50ms | `WeeklyPlanExecution` |
| AI 추천 | 50ms | 최신 insight |
| ~~세금 D-Day · 청구서 한 줄~~ | — | 삭제 2026-09-21 (ADR-002) |
| 포지션 Hero + 보유 목록 | 150ms | `PortfolioHolding` + 최신가 |
| 평가금 흐름 `1y` + MDD | **300ms** | `PriceHistory` 일봉 × 보유 종목 + 거래 |
| 리스크 레이더 4축 | 300ms | 보유 + 30일 일봉 + 뉴스 감정 |
| 거래 미리보기 | 100ms | 해당 종목 거래 전체 재계산(쓰기 없음) |
| 거래 생성 · 수정 · 삭제 | 150ms | 쓰기 + 재계산 1트랜잭션 |
| 거래 목록(30) | 100ms | `@@index([userId, transactionDate])` |
| 알림 목록 · 안 읽은 수 · 모두 읽음 | 100 · 30 · 50ms | `@@index([userId, isRead])` |
| 패널 배치 조회/저장 | 30ms | PK |

## 급소 1 — 스트리밍 부분 저장

토큰이 초당 수십 개 온다. **매 토큰마다 저장하면 쓰기가 폭발한다.**

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 부분 저장을 **2초 또는 500자 중 먼저 오는 것**으로 제한한다 | Must |
| FR-2 | 저장은 `UPDATE coach_messages SET content = ? WHERE id = ?`다. **append가 아니라 전체 교체**다 — Postgres에서 TEXT append는 전체 재작성이므로 차이가 없다 | Must |
| FR-3 | `UPDATE`가 잦으므로 **죽은 튜플이 쌓인다.** `CoachMessage`의 autovacuum 임계값을 낮춘다 | Must |
| FR-4 | 대화당 최대 60초이므로 메시지당 최대 30회 UPDATE다. **허용 범위**임을 측정으로 확인한다 | Must |
| FR-5 | 부분 저장을 **트랜잭션 없이** 한다(단일 UPDATE). 트랜잭션을 열면 스트리밍 동안 잡힌다 | Must |
| FR-6 | 부분 저장 실패가 스트리밍을 중단시키지 않는다. 로그만 남기고 계속 흘린다 | Must |

## 급소 2 — 홈 3블록

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 3블록을 **병렬**로 읽는다. 순차면 400ms를 못 지킨다 | Must |
| FR-11 | 각 블록이 **스냅샷/설정값**을 읽는다. 계산하지 않는다 | Must |
| FR-12 | ~~청구서는 `CounterfactualSnapshot` 최신 1건~~ **삭제 2026-09-21** (ADR-002) | — |
| FR-13 | AI 추천은 `InvestmentInsight` 최신 1건이다(`@@index([userId, type, createdAt DESC])`) | Must |
| FR-14 | 적립은 `WeeklyPlanExecution` 이번 주 행이다(`@@unique([userId, weekOf, symbol])`) | Must |
| FR-15 | ~~세금 D-Day는 `TaxLawConfig` 3행 + 캘린더 구간~~ **삭제 2026-09-21** (ADR-002) | — |
| FR-16 | 총자산은 `PortfolioHolding` 전부다. `FxRate`를 읽지 않는다(`DB-REQ-021` FR-32 개정) | Must |
| FR-17 | **홈 조립 1회의 쿼리 수가 10개 이하**다 | Must |
| FR-18 | 홈을 캐시하지 않는다. 매번 읽는다 | Must |

## 급소 3 — 포지션 1년 계열 (2026-09-21 추가, B13)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-70 | 평가금 계열은 **일봉(`timeframe='1d'`)** 으로 계산한다. `1y`에 분봉을 읽지 않는다 **(기본안 — 감사 문서 B13)** | Must |
| FR-71 | 보유 종목별로 **한 번에** 읽는다(`symbol IN (...)`). 종목마다 쿼리 0건 | Must |
| FR-72 | MDD는 같은 계열에서 **한 번 순회**로 구한다. 추가 쿼리 0건 | Must |
| FR-73 | 리스크 레이더의 변동성 · 낙폭은 성과 계열과 **같은 일봉 조회를 재사용**한다(요청 스코프) | Must |
| FR-74 | 뉴스 리스크는 보유 종목의 최근 N일 기사 감정만 센다(`@@index([symbols])` + `publishedAt` 범위) | Must |
| FR-75 | 포지션 조회 1회 쿼리 수 **≤ 8** | Must |
| FR-76 | 계열이 300ms를 넘으면 그때 **일별 평가금 스냅샷**을 검토한다. 먼저 만들지 않는다(`DB-REQ-021` FR-56) | Should |

## 급소 4 — 거래 쓰기 · 알림 읽음 (2026-09-21 추가, B14 · D5)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-80 | 거래 쓰기 + 보유 재계산은 **한 종목의 거래만** 다시 읽는다. 전 종목 재계산 0건 | Must |
| FR-81 | 미리보기는 **읽기 전용 트랜잭션도 열지 않는다** — 단일 조회 후 메모리 계산 | Must |
| FR-82 | 모두 읽음은 **단일 `UPDATE … WHERE userId=? AND type='signal_update' AND isRead=false`** 다. 행마다 UPDATE 0건 | Must |
| FR-83 | 안 읽은 수는 `COUNT(*)` 1회. 벨 배지가 자주 부르므로 30ms 예산 | Must |

## 커서 페이징

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 대화 목록: `@@index([userId, lastMessageAt DESC])` + 커서 | Must |
| FR-21 | 메시지 목록: `@@index([conversationId, createdAt DESC])` + 커서. **역순**(최신부터) | Must |
| FR-22 | **offset 페이징을 쓰지 않는다.** 대화가 길어지면 깊은 offset이 느려진다 | Must |
| FR-23 | `messageCount`를 비정규화해 목록에서 `COUNT(*)`를 피한다 | Must |
| FR-24 | 페이지 크기 기본 30(메시지) / 20(대화) | Must |

## 인덱스

| 쿼리 | 인덱스 |
|---|---|
| `WHERE userId=? AND archivedAt IS NULL ORDER BY lastMessageAt DESC` | `@@index([userId, lastMessageAt DESC])` + **부분 인덱스 검토**(`WHERE archived_at IS NULL`) |
| `WHERE conversationId=? ORDER BY createdAt DESC` | `@@index([conversationId, createdAt DESC])` |
| `WHERE id=?` (재연결) | PK |
| `WHERE userId=? AND surface=?` | `@@unique([userId, surface])` |
| ~~`FxRate … kind='current'`~~ | 보류 2026-09-21 |
| `WHERE userId=? ORDER BY transactionDate DESC` (거래 목록) | `PortfolioTransaction @@index([userId, transactionDate])` — **이미 있다** |
| `WHERE symbol=? AND timeframe='1d' AND timestamp >= ?` (성과 · 레이더) | `PriceHistory @@index([symbol, timeframe, timestamp])` — **이미 있다** |
| `WHERE userId=? AND type='signal_update' AND isRead=false` (안 읽은 수) | `InvestmentNotification @@index([userId, isRead])` — 이미 있다. `type` 포함 복합 인덱스는 측정 후 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 위 인덱스를 만든다 | Must |
| FR-31 | `archivedAt IS NULL` 부분 인덱스를 검토한다. 아카이브가 쌓이면 유효하다 | Should |
| FR-32 | `EXPLAIN (ANALYZE, BUFFERS)`를 checklist에 첨부한다 | Must |

## MVCC

| 대상 | 성질 | 대응 |
|---|---|---|
| **`CoachMessage`** | **스트리밍 중 잦은 UPDATE** | autovacuum 임계값을 낮춘다. 가장 위험한 테이블 |
| `CoachConversation` | 메시지마다 `lastMessageAt`·`messageCount` UPDATE | 동일 |
| `PanelLayout` | 드물게 UPDATE | 기본값 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | `CoachMessage`·`CoachConversation`의 autovacuum 임계값을 **테이블 단위로 낮춘다** | Must |
| FR-41 | 죽은 튜플 비율을 모니터링한다. **"인덱스가 있는데 느리다"의 흔한 원인**이다 | Must |

## 응답 크기

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | 메시지 목록에 `cardPayload` 전체를 담지 않는다. **카드가 있는지만 표시**하고 상세는 필요 시 조회 | Should |
| FR-51 | `content`가 길 수 있다. 목록에서는 **앞부분만**(예: 200자) 주고 상세에서 전문 | Should |
| FR-52 | 홈 응답에 보유 종목을 담지 않는다. **총합만**. **개정 2026-09-21** — 홈 보유 미리보기 삭제(D6). 보유 목록은 포지션 조회가 준다 | Must |
| FR-53 | `treeJson` 크기 상한 16KB | Must |

## 보존

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | 대화 아카이브를 배치로 나눠 UPDATE한다 | Should |
| FR-61 | 자동 삭제 0건 | Must |
| FR-62 | `CoachMessage`가 가장 빠르게 늘어난다. row 수 추이를 측정한다 | Must |

## Acceptance Criteria

- [ ] 부분 저장이 2초 또는 500자 제한으로 동작한다
- [ ] **메시지당 UPDATE 횟수가 30회 이하다** (측정값 기록)
- [ ] 부분 저장이 트랜잭션 없이 단일 UPDATE다
- [ ] 부분 저장 실패가 스트리밍을 중단시키지 않는다
- [ ] **`CoachMessage`·`CoachConversation` autovacuum 임계값이 낮춰져 있다**
- [ ] 죽은 튜플 비율이 모니터링된다
- [ ] 홈 3블록이 병렬로 읽힌다
- [ ] **홈 조립 1회 쿼리 수 ≤ 10** (`log: ['query']` 확인)
- [ ] 홈 조립 p95 < 400ms (측정값 기록)
- [ ] 홈이 캐시되지 않는다
- [ ] 대화 목록·메시지 목록이 **커서 페이징**이다 (offset 0건)
- [ ] 메시지 목록이 역순(최신부터)이다
- [ ] `messageCount`가 비정규화되어 `COUNT(*)`가 0건이다
- [ ] 인덱스(대화 · 메시지 · 패널 · 거래 · 일봉 · 알림)가 있고 `EXPLAIN` 결과가 checklist에 있다
- [ ] 재연결 조회가 PK로 50ms 이내다
- [ ] 메시지 목록에 `cardPayload` 전체가 담기지 않는다
- [ ] 홈 응답에 보유 종목 목록이 없고 총합만 있다
- [ ] `treeJson` 크기 상한이 있다
- [ ] 자동 삭제가 0건이다
- [ ] `CoachMessage` row 수 추이가 측정된다
- [ ] `1y` 평가금 계열 + MDD p95 < 300ms (보유 10종목 기준, 측정값 기록)
- [ ] 성과 계열이 일봉만 읽고 종목별 쿼리가 0건이다
- [ ] 레이더가 성과 계열 일봉 조회를 재사용한다
- [ ] 포지션 조회 1회 쿼리 수 ≤ 8
- [ ] 거래 쓰기가 해당 종목만 재계산한다
- [ ] 모두 읽음이 단일 UPDATE다
- [ ] 안 읽은 수 p95 < 30ms

## Dependencies

- **선행:** `DB-REQ-021`~`023` · `DB-REQ-008`·`012`·`020`(각 기능 스냅샷)
- **구현:** `SRV-REQ-031`(F006 PERF)
- **규칙:** `performance-database.md`

## Open Questions

- **부분 저장 30회/메시지가 허용 범위인가.** 사용자 ≤10명이면 동시 스트림이 적어 문제가 아닐 가능성이 높지만 실측 필요.
- 메시지 목록에서 `content`를 자를지(FR-51). 대화 UI는 전문이 필요하므로 **자르지 않는 것이 맞을 수 있다** → 페이지 크기로 조절.
- `cardPayload`를 목록에서 제외하면 카드가 있는 메시지를 스크롤할 때 추가 조회가 필요하다 → **포함하는 것이 나을 수 있다.** 크기 측정 후 결정.
- `PriceHistory` 일봉이 1년치 없는 종목(최근 상장 · 백필 전)은 계열이 짧다. 짧은 구간 표시 규칙(빈 앞부분)을 FE와 맞춘다.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | ADR-002 머리 배너. 개정: 홈 5 → 3블록, FR-12 · FR-15 삭제, FR-16(`FxRate` 미사용), FR-52(홈 보유 미리보기 삭제, D6). 추가: 예산 8행 · 인덱스 3행 · FR-70~76(포지션 1년 계열 · MDD · 레이더, B13) · FR-80~83(거래 쓰기 B14 · 알림 읽음 D5). 근거: `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` · `ADR-002` |

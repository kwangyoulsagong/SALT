---
id: BFF-REQ-037
feature: F008
area: bff
kind: API
title: "F008 슬라이스 18 — 가격 변동 범위 중계 (소유자 전용)"
priority: high
created: 2026-09-24
source: pm/requirements/specs/in-progress/FEATURE-008-forecast-intelligence.md
---

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | `GET /api/app/coach/forecast?symbol=` — 인증, 심볼 형식 400 | 완료 |
| FR-2 | 서버 4xx(특히 **404 = 소유자 아님**) 그대로 — `unavailable` 로 바꾸지 않는다(ADR-003) | 완료 |
| FR-3 | 5xx · 타임아웃 → 200 `unavailable`, 800ms · 재시도 1회 | 완료 |
| FR-4 | 뷰모델 — 전망 3종이 빠진 기간은 `contract_incomplete` 로 막는다(열 수는 없다), 기간 4개 항상, 방향은 서버가 줄 때만 | 완료 |
| FR-5 | 해설 응답의 `source` · `droppedSentences` 는 기존 `/ai-coach/explain` 이 그대로 통과시킨다(뷰모델 없음) | 확인 |
| FR-6 | 스트리밍 해설(SSE) | 슬라이스 19 이후 |

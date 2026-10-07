---
id: FC-REQ-019
feature: F009
area: forecast
kind: FUNC
title: "F009 FR-33 — 변동 범위 게이트 · 사건/쏠림 반응 통계에 판정 창 · 빗나간 수"
priority: high
created: 2026-10-07
source: pm/requirements/specs/in-progress/FEATURE-009-behavior-risk-coach.md FR-33 · salt-server/requirements/specs/done/SRV-REQ-039-F009-PERFORMANCE-CLAIM.md
---

## Summary

성적 문구 4요소(`SRV-REQ-039`)의 기간 · 빗나간 수를 **쓰기 주인이 판정할 때 같이 남긴다.** 변동 범위 게이트는 최근 `GATE_WINDOW`(52) 점수로
판정하는데 그 창의 날짜가 어디에도 없었고, 사건 반응은 최근 3건 목록(`recent_misses`)만 있어 빗나간 수 전체를 알 수 없었다.
서버가 `score` 를 다시 세면 창 정의(짝짓기 · 주 격자)가 두 곳이 된다. 판정 · 채점 규칙은 바뀌지 않는다.

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | `domain/scoring.py` `GateResult.miss_count` — 판정 창 안에서 90% 범위 밖이었던 수(`not hit90`) | 완료(`a24e764`) |
| FR-2 | `scoring/evaluate.py` `gates` — 짝지은 as_of `paired[-GATE_WINDOW:]` 의 첫 · 마지막을 `GateRow.window_from` · `window_to` 로. 표본 0 이면 None | 완료 |
| FR-3 | `domain/events.py` `ReactionStats.window_from` · `window_to`(표본 사건 첫 · 마지막) · `miss_count`(빗나간 수 전체) · `miss_judged`(앞 사건 ≥ `MIN_SAMPLE` 인 판정 대상 수). 막힌 통계에도 싣는다 | 완료 |
| FR-4 | `store/tables.py` · `store/predictions.py` · `store/events.py` 열 추가. DDL 은 `salt-server` `20261007120000_forecast_claim_window`(`DB-REQ-029` FR-25) | 완료 |

## 하지 않는 것

- 이전 `as_of` 행 소급 — 뷰는 최신 행만 읽는다. 다음 배치가 채운다
- 게이트 · 채점 규칙 변경 — 열만 더했다

## Changelog

- 2026-10-07: 초판 · FR-1~4 완료(`a24e764`)

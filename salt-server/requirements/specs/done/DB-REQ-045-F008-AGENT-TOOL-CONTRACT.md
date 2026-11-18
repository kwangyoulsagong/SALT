---
id: DB-REQ-045
feature: F008
area: db
kind: MIGRATION
title: "forecast — 에이전트 도구 계약(이웃 · 문서 · 최근 사건 함수 · 반응 뷰) + O2 관문 표"
priority: medium
created: 2026-11-18
status: done
source: salt-forecast/requirements/specs/in-progress/FC-REQ-023-F008-AGENT-TOOLS.md (FR-1 · 2 · 6)
---

## Summary

`FC-REQ-023` 의 DDL 몫. `forecast` DDL 주인은 서버 S5 전까지 `salt-server/prisma`(`db-contract.md` §2). 마이그레이션 `20261118200000_forecast_agent_tools` — 추가만.
쓰기는 salt-forecast(`ontology_quality` 가 관문 행), 읽기는 서버 coach(`SRV-REQ-059`). 사용자 열 0.

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | `ontology_quality_gate(checked_at, market, precision, recall, ok, labels)` + `f_agent_mentions_ok(market, as_of)` — 마지막 관문, 기록 없으면 false | done |
| FR-2 | `f_agent_neighbors(start, depth, as_of)` — `f_neighbors` 걸음 + mentions 는 관문 통과 · 확신 ≥ 0.5 · 30일 문서만, 문서 · 사건은 지나가는 점, 같이 언급 문서 수 | done |
| FR-3 | `f_agent_documents(entity, since, as_of, lim)` — 언급 · 회사 공시. "최근"은 `observed_at`, 누수 거르기는 `available_at`. 공시 먼저. DART 접수번호 → 뷰어 주소 | done |
| FR-4 | `f_agent_recent_events(entity, since, as_of)` — 종목에 닿은 일정 · 신호(종류마다 최근 하나) | done |
| FR-6 | `f_neighbors`(`FC-REQ-022`) 같은 원인 고침 — 마이그레이션 `20261118200100`: "어디서 왔나"를 앞 홉 점에서 · 허브에서 시작하면 1홉. 3홉 p95 2.4초 → 33ms(데이터가 늘며 `test_neighbors_asof_and_p95` 가 깨져 있었다) · 허브 아닌 시작점 6개 결과 양방향 차이 0 | done |
| FR-5 | `v_agent_event_reactions` — 사건 창 · 소식 반응(status ok) · 신호 · 실적 반응(renderable)을 한 모양으로. 업종 범위 통계는 없다 | done |

## Acceptance Criteria

- [x] as-of 누수 — 무작위 1,000회 문서 미래 0 · 관문 미달 동안 언급 0 · 백필 옛 공시 0(`tests/store/test_agent_tools_asof.py`)
- [x] 반응 뷰 = 원천 뷰 통과 행 수(가족마다)
- [x] 이웃 2홉 p95 < 200ms(실데이터 200종목 — 4ms · 3홉 38ms · 허브 종목 삼성전자 2홉 28ms)
- [x] 롤백 SQL 머리 주석(두 마이그레이션)
- [x] `f_neighbors` 결과 대조 — 옛 본문을 트랜잭션 안 임시 이름으로 만들어 EXCEPT 양방향 0(허브 아닌 6 시작점) · 허브 시작만 7,503 → 489(1홉, 의도)

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-18 | FR-6 — 같은 원인으로 깨져 있던 `f_neighbors` 3홉 p95(2.4초 · 코스피 시작 69초)를 같은 방식으로 고침(`20261118200100`) |
| 2026-11-18 | 신규 · done — `feat/fc-req-023-agent-tools`. 머지 전 고침 셋(같은 마이그레이션 — 로컬만 적용돼 있어 되돌리고 다시 적용): 이웃 3.6초 → CTE 대신 관계 표 인덱스 · 허브 종목 2홉 0.9초 → "어디서 왔나"를 앞 홉 점에서 펼침(4종목 결과 diff 0 · 28ms) · 문서가 공시를 최신 언급에 밀어냄 → 공시 먼저 · 백필 옛 공시가 "이번 주"로 → `observed_at` 기준 · 최근 사건 함수 추가(A/B ② 3 : 17 원인) |

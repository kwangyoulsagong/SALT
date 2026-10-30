---
id: FC-REQ-025
area: forecast
kind: ARCH
title: "O5 — forecast DDL 주인을 salt-forecast 로 · public 직접 읽기 4곳을 export 뷰로 · 일봉 이벤트 구독"
priority: medium
created: 2026-10-30
source: requirements/decisions/ADR-007-forecast-ontology-schema-owner.md
---

## Summary

서버 S5(market 이전, `SRV-REQ-049`)와 같은 시점. "자기 스키마는 자기가"를 forecast 에도.

## FR

| FR | 내용 |
|---|---|
| FR-1 | `salt-forecast/migrations/` — plain SQL + 버전 표(`forecast.schema_version`). 현재 `salt-server/prisma/migrations` 의 forecast DDL 최종 상태를 baseline 으로 |
| FR-2 | 이전 뒤 서버 쪽 forecast DDL 추가 0. 루트 `CLAUDE.md` · `salt-forecast/CLAUDE.md` 의 "DDL 은 salt-server/prisma 에서만" 문장 갱신 |
| FR-3 | `store/*.py` 의 `public.price_history` · `market_holidays` · `kr_stock_master` · `judgment_ledger` 읽기를 `market.v_*_export` · `coach.v_judgment_ledger_export` 로(`DB-REQ-036` FR-7). forecast 계정은 export 뷰 SELECT 권한만 |
| FR-4 | `import-linter` 계약에 "store 는 export 뷰 이름만" 검사 추가(문자열 검사) |
| FR-5 | `market.DailyCandleClosed` 구독(경량 소비자 프로세스) → 해당 시장 일일 잡 당김. 매시 cron 확인 · 놓친 회차 보정은 그대로 남김(이벤트가 빠져도 동작) |
| FR-6 | 뷰 계약(`v_forecast_card` 등) 변경 시 소비자(coach)와 같은 PR 규칙 유지 |

## Acceptance Criteria

- [ ] forecast 계정으로 `public.*` SELECT 권한 오류
- [ ] 전체 잡 1회차가 export 뷰로 통과 · 결과가 이전과 같다(최근 30일 비교)
- [ ] 이벤트 끊김 상태에서도 cron 으로 일일 잡 실행

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-10-30 | FR-2 의 문장 갱신을 미리 — 루트 `CLAUDE.md` · `salt-forecast/CLAUDE.md` · `db-contract.md` §2 에 "S5 전까지 Prisma, S5 에 `salt-forecast/migrations/`" 로. 이전 자체는 그대로 to-do |

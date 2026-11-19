# DB-REQ-019 checklists

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: M6 · M7 · M9 실행됨(`20260923042043_add_coach_generation_log` · `20260923041818_add_coach_pro / 실패사례 출처 · FR-12 의 N+1 `signal-performance.service.ts` 는 지난 일 — 스냅샷 원장 · `collectPerformanc

## 2026-11-19 FR 대조 정리 (`WEB-perf-req-close-slice.md`, `feat/web-perf-close`)

- 상태: **to-do → done**. FR ↔ 근거 전체 표는 스펙 `## 정리 2026-11-19` 절(1:1)
- 충족: M6 · M7 · M9(마이그레이션 셋) · FR-30 · 31(`payload` 유지, schema.prisma:579) · FR-42(M9 집계 SQL 0) · FR-43(`confidence`, :578) · FR-44(`smart_buy_zone`, :557)
- 대체: M1 ~ M5 · M8 · FR-1 ~ 17 · 20 ~ 24 · 40 · 41 · 45 · 46 — 원장 표(`coach_recommendation_snapshots` schema.prisma:600-623 · `symbol_judgment_snapshots` :637~)가 값을 낼 때 열로 쓴다. 백필 · 매핑 시드 대상 없음(`IndicatorTrackRecord` 모델 0)
- 이번 브랜치 마이그레이션 0 · 서버 `npm run build` 통과
- 미충족: 없음

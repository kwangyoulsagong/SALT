# FE-REQ-029 (F004 PERF) — 회고

- 날짜: 2026-09-22 · 슬라이스: `F004-fe-coach-panel` · 루트 회고: `requirements/reports/retrospects/F004-fe-coach-panel.md`

## 잘 된 것
- 번들을 전후로 쟀다: `/investments` First Load 135 → 135 kB (페이지 +0.17 kB)
- 취소를 브라우저에서 쟀다: 11회 빠른 선택 중 6~8 `ERR_ABORTED`

## 부채 · 다음 행동
- 행 선택 → 판단 페인트 p95 · 모드 전환 표 리렌더 · CLS 는 안 쟀다 — 상세 페이지 슬라이스에서 Profiler · PerformanceObserver 로
- hover 디바운스 80ms(기존) vs REQ 150ms — 판단 요청 수가 문제로 보이면 코치 쿼리만 따로 늦춘다

# FE-REQ-029 (F004 PERF) — 검증 체크리스트

- REQ: `salt-microFe/requirements/specs/in-progress/FE-REQ-029-F004-PERF.md`
- 브랜치: `feat/f004-fe-coach-panel` · 검증일: 2026-09-22
- 상태: **부분 완료** — 패널(FR-70~76 중 일부)
- **전 영역 통합 기록**: 루트 `requirements/reports/checklists/F004-fe-coach-panel.md`

| FR · 예산 | 판정 | 근거 |
|---|---|---|
| FR-70 취소 + 디바운스 | pass · 다르게 구현 | 취소 6~8/11 실측, 디바운스 80ms(기존) |
| FR-71 모드 전환 요청 0 · 표 리렌더 0 | 요청 pass · 리렌더 **미검증** | Profiler 미측정 |
| FR-72 판단만 스켈레톤 · CLS 0 | pass (구조) | 스켈레톤이 실제 블록과 같은 `minHeight`. CLS 수치는 안 쟀다 |
| FR-75 `"use client"` 범위 | pass · 기록 | 모드 스위치 · 모드 훅 · 조회 훅 + 조합 잎 2(`CoachPanel` · `InvestmentsBoard`). 표시 블록(판단 · 구간 · 적중률 줄)은 경계 없음 |
| 패널 · 상세 JS 증가분 ≤ 25KB gzip · 차트 라이브러리 추가 0 | pass | `/investments` First Load 135 → 135 kB(페이지 +0.17 kB). 패널은 lazy chunk, 새 의존성 0 |
| 행 선택 → 판단 페인트 p95 300ms | **미검증** | 표본 측정 안 함 — 상세 페이지 슬라이스 |
| FR-76 관측 | **미충족** | 관측 인프라 미정 |

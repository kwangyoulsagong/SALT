---
id: FE-REQ-038
feature: F008
area: fe
kind: UI
title: "F008 슬라이스 19 — 상세 분석 가격 변동 범위 카드 (소유자 전용)"
priority: high
created: 2026-09-24
source: pm/requirements/specs/in-progress/FEATURE-008-forecast-intelligence.md
---

| FR | 내용 | FEATURE-008 | 상태 |
|---|---|---|---|
| FR-1 | 기간별 90% 범위 띠(가운데 50% 굵게 · 중앙값 · 기준가 점선) + 가격 표 | FR-65 | 완료 |
| FR-2 | "이 주에 판다면" — 보유 수량 기준 평가금액 변화(서버 값), 부호 문자 + 국내 색 | FR-65 | 완료 |
| FR-3 | 성적 — 실제 적중 · 범위 폭(단순 예측 대비) · 표본을 **한 줄에**, 백테스트 라벨 | FR-10 · 67 | 완료 |
| FR-4 | 빗나간 때 · 꺼 둔 기간 사유 | FR-66 | 완료 |
| FR-5 | 비소유자(404) · 로그아웃 · 불러오는 중 → **자리 자체가 없다** | ADR-003 | 완료 |
| FR-6 | 띠가 기간 순으로 그려지고 표 행이 차례로 나타난다 · `prefers-reduced-motion` 이면 즉시 | FR-62 · 64 | 완료 |
| FR-7 | 해설 SSE 스트리밍 · 출처 칩 · `source: template` 배지 | FR-60 · 63 | 다음 |

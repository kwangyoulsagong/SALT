---
id: FC-REQ-002
feature: F008
area: forecast
kind: FUNC
title: "F008 슬라이스 20 — LightGBM 분위수(도전자) · 시점 고정 피처 · 부트스트랩 게이트 · 챔피언/도전자"
priority: high
created: 2026-09-23
source: pm/requirements/specs/in-progress/FEATURE-008-forecast-intelligence.md
---

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | 피처 22종(가격 · 순위 · BTC · 펀딩비 · 김치 프리미엄 · 거시 · 스테이블코인) — 전부 as_of 필수, 거시는 빈티지 | 완료 |
| FR-2 | 종목 풀링 LightGBM 분위수, 정규화 타깃, 4주 재학습, 엠바고 | 완료 |
| FR-3 | 게이트: 기준 대비 pinball 개선의 부트스트랩 95% 하한 > 0 | 완료 |
| FR-4 | 챔피언/도전자 — 도전자는 채점만, 승격은 코드 변경 + 기록 | 완료 |
| FR-5 | 진행 로그(경과 · 남은 시간 추정) | 완료 |
| FR-6 | **기준을 이긴다** | **미달** — v0.1 이 6.7~9.1% 나빴다 |

## 결과

`requirements/reports/checklists/F008-forecast-baseline.md` §슬라이스 20.

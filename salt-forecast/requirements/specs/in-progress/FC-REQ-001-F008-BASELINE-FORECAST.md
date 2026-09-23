---
id: FC-REQ-001
feature: F008
area: forecast
kind: FUNC
title: "F008 슬라이스 16 — Python 뼈대 · 업비트 일봉 · 기준 모델 · 보정 · 워크포워드 채점 · 자동 소등"
priority: high
created: 2026-09-23
source: pm/requirements/specs/in-progress/FEATURE-008-forecast-intelligence.md
---

## Summary

화면 없이 **"코인 전망 + 정직한 채점"이 DB 에 쌓이는 상태**를 만든다. 모델은 기준 모델뿐이다 — 기준을 먼저 세워야
다음 슬라이스의 LightGBM 이 "이겼는지"를 잴 수 있다(`modeling-evaluation.md` §2).

## FR

| FR | 내용 | FEATURE-008 |
|---|---|---|
| FR-1 | `uv` 프로젝트 · 층 구조 · `import-linter` 계약 · ruff · pyright strict · pytest | — |
| FR-2 | 업비트 일봉 수집 + 백필(`--since`), `available_at` = 봉 마감, 멱등 upsert | FR-20 · 26 |
| FR-3 | 기준 A(무작위 보행 정규) · 기준 B(경험 분위수) · 앙상블(A·B 분위수 평균) | FR-1 · 2 · 5 |
| FR-4 | 분위수 보정(CQR + 적응형 ACI) — 학습 창 잔차만 | FR-3 |
| FR-5 | 워크포워드 백테스트(엠바고 h 주) → `prediction` · `score` `kind=backtest` | FR-4 |
| FR-6 | 매일 예측 `kind=live` · 기간 지난 예측 채점 | FR-4 |
| FR-7 | "자신 있을 때만" 방향 판정 — 임계는 학습 창 안에서 | FR-9 |
| FR-8 | 게이트: 표본 · 기준 대비 pinball · 90% 커버리지 · 폭 · 신선도 | FR-6 · 10 |
| FR-9 | 누수 테스트 4종(`time-and-leakage.md` §6) | FR-4 |
| FR-10 | 백테스트 리포트 `reports/` | — |

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| LightGBM · 공시 · 내부자 피처 | 기준이 먼저 | 슬라이스 20 `FC-REQ-002` |
| ETS 기준(`statsforecast`) | 기준 A · B 로 게이트가 선다. 의존성 무게 대비 | 슬라이스 20 |
| 주식 시세 | 무료 소스 미정 | 열린 질문 |
| 규칙 가격 도달 확률(FR-7 of F008) | 보유 규칙 가격은 서버가 안다 — 서버 조합 방식 결정 필요 | 슬라이스 17 |
| cron 등록 | 로컬 운영 방식 미정 — 작업은 CLI 로 돈다 | 슬라이스 17 전 |

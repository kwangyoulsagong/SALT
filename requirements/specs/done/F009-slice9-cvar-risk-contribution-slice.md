---
id: SLICE-F009-9-CVAR-RISK-CONTRIBUTION
title: "F009 슬라이스 9 — 흔들림 몫 · 나빴던 날 평균 (FR-26)"
priority: medium
labels: [F009, slice, server, bff, fe]
created: 2026-10-29
---

## Summary

`FEATURE-009` FR-26(Could) — CVaR · 공분산 위험 기여도. 2026-09-27 사용자 결정으로 "주식 확장 때"까지 미뤘고, F011 로 국내 주식이
들어와 그 조건이 찼다(2026-10-29 사용자 "새브랜치 파고 다음꺼 진행").

F011 FR-46(7e)이 이미 코인 + 국내 보유의 일간 수익률 행렬 · 공분산 · KRX 거래일 축을 만든다. 이 슬라이스는 **그 행렬 위에 두 값만** 더한다.

| 값 | 정의 | 왜 이 정의인가 |
|---|---|---|
| 흔들림 몫 | wᵢ(Σw)ᵢ ÷ wᵀΣw — 실현 공분산 분산의 오일러 분해. 합 1, 음수 = 줄임 | 비중과 몫의 차이가 "같이 움직이는 만큼"이다. 모델 없이 FR-46 의 Σ 를 나눌 뿐 |
| 나빴던 날 평균 | 지금 비중을 창 250 축 날짜마다 얹은 단순 하루 수익률 중 아래 5%(올림) 평균 = 과거 시뮬레이션 CVaR 95%. 금액 = 비율 × 값을 낸 평가금 | 분포 가정이 없다(코인 꼬리가 두껍다). 날 수를 같이 내보내 표본 크기를 숨기지 않는다 |

| 영역 | REQ | 이 슬라이스 몫 |
|---|---|---|
| 서버 | `salt-server/requirements/specs/done/SRV-REQ-038-F009-RISK.md` FR-17 | `policy/portfolioVolatility` `contributions` · `tail` · 국내 이름 · 로고 |
| BFF | `bff/requirements/specs/done/BFF-REQ-038-F009-TRADE-RISK.md` FR-14 | `toContributions` · `toTailLoss` |
| 프론트 | `salt-microFe/requirements/specs/done/FE-REQ-039-F009-TRADE-RISK.md` FR-27 | `RiskGaugeList` 두 칸 |

하지 않는 것:

- **확률 · 예측으로 말하기**("5% 확률로 −N원") — FR-25 시나리오와 같은 규칙. "지난 기록을 지금 보유에 얹은 값"으로만
- **예산 · 판정**(몫 상한 · "줄이세요") — 측정 · 미러까지(F009 정책)
- 별도 공분산 모델(수축 · 요인) — 사용자 ≤ 10명 · 보유 수 종목, FR-46 실현 공분산으로 충분

## 계약

- `GET /api/coach/risk-budget` · `GET /api/app/coach/risk-budget` `gauges.portfolioVolatility` 에 `contributions[]` · `tail` **추가만**. 기존 필드 · 값 무변경
- `@repo/core` `RiskContributionView` · `TailLossView` — 옵션 필드(옛 BFF 면 칸 없음)
- DDL · 마이그레이션 · env 없음

## 커밋

- `7789bcc` feat(server) — 계산 · 응답 · Swagger. 계약의 원천
- `c81c248` feat(bff) — 뷰모델 통과
- `6f19e4c` feat(fe) — 두 칸. 음수 몫이 줄 제한에 묻히던 것을 같은 커밋 전에 고쳤다

---
id: SLICE-F011-7C-KR-COST-TABLE
title: "F011 슬라이스 7c — 국내 주식 비용: 매도일 거래세 표 · 수수료 (FR-44)"
priority: medium
labels: [F011, slice, server, bff, fe]
created: 2026-10-26
---

## Summary

사용자 "새 브랜치 파고 다음꺼 진행"(2026-10-26) → 남은 슬라이스 7(FR-44 · 46 · 47) 중 스펙 순서대로 **FR-44 비용**.
7a 때는 "국내 채점이 2026-10 부터라 2025 매도가 없다"고 미뤘지만, 7b 가 2022~ 백테스트 표본 51,305 를 성적으로 올리면서
0.23% 상수 하나로 2023 · 2024 · 2025 매도(0.20 · 0.18 · 0.15%)를 채점하게 됐다(리서치 권고 18).

거래세는 매도일(KST) 구간 표, env 는 수수료 한쪽만. 채점 · 기저율 · 사이즈 계산 · 백테스트가 같은 표를 쓴다.

| 영역 | REQ | 몫 |
|---|---|---|
| 서버 | `salt-server/requirements/specs/in-progress/SRV-REQ-040-F011-KR-STOCK.md` FR-44 | `KR_STOCK_SELL_TAX` · `roundTripCostAt` · `costSql` · `sizingCosts` · 백테스트 @2 · size-check `sellTaxRate` |
| BFF | `bff/requirements/specs/done/BFF-REQ-040-F011-KR-STOCK.md` FR-23 | 통과 |
| 프론트 | `salt-microFe/requirements/specs/done/FE-REQ-041-F011-KR-STOCK.md` FR-27 | 국내 비용 고지 문구 |
| 주인 REQ(Changelog) | `SRV-REQ-038` · `BFF-REQ-038` · `FE-REQ-039` | 사이즈 계산 · 뷰모델 · `SizeCheckLines` 주인 |
| 짝(변경 없음) | 예측 · DB — DDL · 뷰 무변경(백테스트 행만 교체) | — |

## 판단 — 리뷰가 볼 곳

1. **새 사전등록 키 `kr-judgment-backtest@2`** — @1 이 "비용 0.0023 고정 · FR-44 는 이 등록에서 안 쓴다"고 적었다. 돌리기 전에 @2 를 커밋했고 @1 리포트는 그대로 둔다. 결과: 판정 6 · 풀 39 / 51,305 표본만 바뀜, 피하기 초과 +3.29% 그대로
2. **세금 날짜 = 채점 시각(`evaluated_at`)의 KST 날짜** — 백테스트는 만기 종가 확정 시각, 라이브는 채점 시각(만기 직후). 결제일 T+2 와의 연말 1~2일 어긋남은 근사
3. **사이즈 손실은 거래세를 청산 금액에만** — 전엔 왕복 절반을 진입 · 청산 양쪽에 붙였다. 응답 `feeRatePerSide` 의 국내 값 의미가 바뀐다(왕복 절반 → 수수료 한쪽) — 그래서 화면 문구도 같이 바꿨다
4. **암묵 비용은 0 · "세전"은 리포트에만** — 스프레드 · 슬리피지 근거 수치가 없다. 화면은 "호가 차이로 더 나가는 비용은 빼고"라고 말한다. 사이즈 손실에는 양도세가 없어(소액주주 비과세) "세전" 문구가 할 일이 없다
5. **계약** — size-check `assumptions.sellTaxRate` 추가 · 국내 `feeRatePerSide` 값 의미 변경 · env 이름 변경(설정한 곳 없음)

## 검증 · 미검증

`requirements/reports/checklists/F011-slice7c-kr-cost-table.md` · 회고 `requirements/reports/retrospects/F011-slice7c-kr-cost-table.md`.

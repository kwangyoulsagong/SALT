---
id: SLICE-F011-7E-KR-PORTFOLIO-VOLATILITY
title: "F011 슬라이스 7e — 코인 + 국내 주식 보유 합산 변동성 범위 (FR-46)"
priority: medium
labels: [F011, slice, server, bff, fe]
created: 2026-10-26
---

## Summary

사용자 "1 2 다 해야하는거 아니야?"(2026-10-26) → 슬라이스 7 마지막 FR-46. 리서치 권고 20(근거 약): 코인 · 국내 주식 상관을 잰
학술 근거가 없고 보도는 엇갈린다 — 고정 상관 대신 **상관 1 상한과 최근 실현 상관 두 값을 범위로**, 코인을 KRX 종가 시각에 맞추고 365/252 를 맞춘다.
사용자 질문 "둘이 독립 아니야?"에 실측으로 답했다: 최근 250거래일 코인 몫 · 국내 몫 상관 0.24~0.28 — 독립(0)도 1 도 아니다.

| 영역 | REQ | 몫 |
|---|---|---|
| 서버 | `salt-server/requirements/specs/in-progress/SRV-REQ-040-F011-KR-STOCK.md` FR-46 | `domain/policy/portfolioVolatility` · risk-budget `gauges.portfolioVolatility` |
| BFF | `bff/requirements/specs/done/BFF-REQ-040-F011-KR-STOCK.md` FR-25 | 통과 · 두 끝 규칙 |
| 프론트 | `salt-microFe/requirements/specs/done/FE-REQ-041-F011-KR-STOCK.md` FR-29 | 리스크 예산 "보유 전체 흔들림(연)" 줄 |
| 주인 REQ(Changelog) | `SRV-REQ-038` · `BFF-REQ-038` · `FE-REQ-039` · `FE-REQ-040` | 리스크 예산 · 뷰모델 · 게이지 목록 주인 |
| 짝(변경 없음) | 예측 · DB — 일봉 읽기만 | — |

## 판단 — 리뷰가 볼 곳

1. **as-of 정렬** — 코인 시간봉을 보관하지 않아 KRX 종가(15:30) 시점에 알 수 있던 마지막 코인 일봉 종가(09:00 KST)를 쓴다. 미래를 쓰지 않고, 주말 코인 변동은 다음 거래일 수익률에 쌓인다. 6.5시간 근사
2. **한 축 · 한 연율** — 국내를 들고 있으면 모든 수익률이 KRX 거래일 축에 있어 √252 하나. 코인만이면 달력일 · √365
3. **범위의 두 끝** — 실현 √(wᵀΣw) · 상관 1 가정 Σwσ. 화면은 막대 · 판정 없이 목표 변동성과 나란히만
4. **끊김 · 정지** — 국내 종가 비율 0.69~1.31 밖인 날은 행째 제외(원천 끊김), 정지일은 직전 종가(수익률 0 — 결측이 아니다)

## 검증 · 미검증

`requirements/reports/checklists/F011-slice7e-kr-portfolio-volatility.md` · 회고 `requirements/reports/retrospects/F011-slice7e-kr-portfolio-volatility.md`.

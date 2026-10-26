---
id: SLICE-F011-7F-KR-MONTHLY-REVIEW
title: "F011 슬라이스 7f — 월간 복기 국내 주식판 (FR-48)"
priority: medium
labels: [F011, slice, server, db, bff, fe]
created: 2026-10-26
---

## Summary

7d · 7e 실데이터 확인 때 남은 것(`F011-slice7d-kr-behavior-mirror` 체크리스트 "월간 복기 국내판"). 월간 복기(F009 FR-28)가 코인
거래만 세서 9월에 국내 거래가 있어도 "적은 거래가 없어요"였다. 사용자 방향 "기능은 코인과 똑같다(데이터만 다르다)"대로
**같은 복기 엔진 · 같은 카드에 국내 데이터 · 거래일 축**을 붙이고, 코인판과 **따로 저장**한다(자산군마다 한 벌).

| 영역 | REQ | 몫 |
|---|---|---|
| 서버 | `salt-server/requirements/specs/in-progress/SRV-REQ-040-F011-KR-STOCK.md` FR-48 | 국내 복기 계산 · `GET /api/coach/review/monthly/kr-stock`(소유자 404) · 월초 배치 두 자산군 |
| DB | `salt-server/requirements/specs/done/DB-REQ-031-F009-SCHEMA.md` FR-11 개정 | `monthly_reviews.asset_type`(기본 `crypto`) · 유니크 `(user_id, asset_type, month)` |
| BFF | `bff/requirements/specs/done/BFF-REQ-040-F011-KR-STOCK.md` FR-26 | 경로 · 뷰모델 `assetType` · 빗나간 예측 `name` |
| 프론트 | `salt-microFe/requirements/specs/done/FE-REQ-041-F011-KR-STOCK.md` FR-30 | `/coach/report` 코인 복기 아래 "국내 주식 월간 복기" 섹션 |
| 주인 REQ(Changelog) | `SRV-REQ-038` · `SRV-REQ-024` · `SRV-REQ-025` · `BFF-REQ-038` · `BFF-REQ-023` · `FE-REQ-039` · `FE-REQ-040` · `FE-REQ-027` · `FE-REQ-028` | 복기 · 조립 · 경로 · 뷰모델 · 화면 · 클라이언트 주인 |
| 짝(변경 없음) | 예측 — 일봉 읽기만 | — |

## 판단 — 리뷰가 볼 곳

1. **자산군마다 한 벌 저장** — payload 하나에 두 자산군을 넣으면 저장된 코인 복기를 고쳐야 한다(W06 "만든 뒤 고치지 않는다"). 열 하나 + 유니크 교체로 기존 행의 의미가 그대로다(기본 `crypto`). 롤백 SQL 은 마이그레이션 머리에
2. **시간 축 — 거래를 KST 벽시계로** — 판정 배치는 봉을 옮기고(`toKrBarClock`), 복기는 거래 · 결과 `closedAt` · 계획 시각 · `now` 를 옮긴다. 날을 걷는 계산(`walkPortfolioDays`)이 UTC 날 경계라서다. 국내 미러와 같은 축. 저장 시각(`from` · `to` · 빗나간 예측)은 실제 시각으로 되돌린다
3. **거래일** — IPS 이탈 날 · 보유 대비는 거래일만 걷고, 보유 기간은 거래일(국내 미러 `krClosingHoldings` 와 같은 규칙), 휴장일 매도 장부 손익은 직전 거래일 종가
4. **"오를 확률" 계획의 자산군** — 계획에 자산군이 없어 종목 시세의 자산군으로 가른다(모르면 코인 — 사이즈 점검과 같은 규칙). 부수 효과: 코인판이 국내 계획을 더는 채점하지 않는다(그전엔 섞일 수 있었다)
5. **IPS 이탈은 두 자산군 합산**(후속, 사용자 "베스트 케이스로") — 예산 · 상한은 사용자 하나에 하나이고 리스크 예산 게이지도 합산이다. 코인 · 국내 거래가 다 있는 달은 두 판이 같은 합산 값을 싣는다(KST 날짜 축 · 코인 as-of 09:00 · 달력일). 한 자산군만이면 그 판 계산 그대로
6. **소유자 전용은 보여 주는 쪽만** — 배치는 모든 사용자 · 두 자산군을 돈다(국내 거래가 없으면 `no_ledger` 로 안 만든다). 조회 경로가 404

## 검증 · 미검증

`requirements/reports/checklists/F011-slice7f-kr-monthly-review.md` · 회고 `requirements/reports/retrospects/F011-slice7f-kr-monthly-review.md`.

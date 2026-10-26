---
id: SLICE-F011-6-KR-INDEX-INVESTORS
title: "F011 슬라이스 6 — 국내 지수 요약 · 투자자별 순매수 (FR-48 · FR-29 · FR-91 부분)"
priority: low
labels: [F011, slice, server, db, bff, fe]
created: 2026-10-26
---

## Summary

F011 에서 남은 슬라이스는 6(부가 정보, 전부 Should) 하나였다. 사용자가 넷(호가 · 투자자별 · 시간외 단일가 · 지수 요약) 중
**지수 요약 · 투자자별**을 골랐다. 국내 주식 탭은 코인 요약 띠 자리가 비어 있었고(코인 숫자를 국내 탭에 두지 않는다),
국내 상세엔 시세 말고 누가 사고팔았는지가 없었다. 둘 다 **사실만** 보인다 — 매수 − 매도, 값 · 등락 · 종목 수. 해석 문구 0.

| 영역 | REQ | 몫 |
|---|---|---|
| 서버 | `salt-server/requirements/specs/in-progress/SRV-REQ-040-F011-KR-STOCK.md` FR-49 · 50 | 조회 TR 2 · 수집(지수 매분 · 투자자 18:40) · 읽기 경로 2(소유자 404) · 부가 작업 한도 양보 |
| DB | `salt-server/requirements/specs/done/DB-REQ-033-F011-KR-STOCK.md` FR-7 · 8 | `kr_index_quotes` · `kr_stock_investor_flows` |
| BFF | `bff/requirements/specs/done/BFF-REQ-040-F011-KR-STOCK.md` FR-27 · 28 | 경로 · 뷰모델 |
| 프론트 | `salt-microFe/requirements/specs/done/FE-REQ-041-F011-KR-STOCK.md` FR-31 · 32 | 국내 탭 지수 띠 · 상세 투자자 표 |
| 주인 REQ(Changelog) | `SRV-REQ-008` · `SRV-REQ-024` · `SRV-REQ-036` · `FE-REQ-010` · `FE-REQ-012` · `FE-REQ-013` · `FE-REQ-037` · `FC-REQ-020` | 조립 · 설정 · 요약 정책 · 엔드포인트 · 성능 · 요약 띠 자리 · 예측(피처 아님) |
| 짝(변경 없음) | 예측 — 투자자 기록을 읽지 않는다 | — |

## 판단 — 리뷰가 볼 곳

1. **읽기는 저장값만** — 투자자 표를 "상세를 열 때 KIS 를 부르는" 방식으로 하지 않았다. 국내 읽기 경로 원칙(KIS 동기 호출 0 · 80ms)을 지키는 대가로 새로 관심에 넣은 종목은 다음 개장일 저녁까지 빈 상태다(화면이 그렇게 말한다)
2. **당일 값은 18:00 KST 뒤만 · 매일 30거래일 덮어쓰기** — 장중 값이 잠정일 수 있어 그 전엔 버리고, 18시 뒤 저장한 행도 다음 날 회차가 다시 받아 고친다. 확정 시각 자체는 실측 전(미검증 표)
3. **부가 작업은 한도에서 맨 뒤(FR-91 부분)** — 한도 초과를 한 번 만나면 회차를 접는다. 재시도로 줄을 붙잡지 않는다. 작업 전체 우선순위 큐는 아직(부가 작업이 셋이 될 때 — 6b)
4. **보일 지수는 서버 설정** — `KIS_SUMMARY_INDICES`(기본 코스피 · 코스닥), 이름은 서버 도메인 표. 프론트 지수 상수 0건(요약은 서버 소유)
5. **합계는 서버** — 10거래일 합계를 BFF · 프론트가 더하지 않게 응답에 `totals`(행 없으면 `null` — 0 을 "순매수 0" 으로 읽게 두지 않는다)
6. **예측 피처가 아니다** — 수급 신호는 국내 리서치 결론상 워크포워드 전 금지(`FC-REQ-020` Changelog). 유니버스(약 50종목)만이고 KIS 가 30거래일만 주므로, 피처로 쓰려면 수집 범위부터 다시 정한다

## 검증 · 미검증

`requirements/reports/checklists/F011-slice6-kr-index-investors.md` · 회고 `requirements/reports/retrospects/F011-slice6-kr-index-investors.md`.

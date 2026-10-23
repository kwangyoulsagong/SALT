---
id: SLICE-F011-5D-KR-FORECAST-CARD
title: "F011 슬라이스 5d — 국내 주식 변동 범위 카드 화면"
priority: high
labels: [F011, slice, forecast, fe]
created: 2026-10-23
---

## Summary

사용자 "새브랜치 파고 다음꺼 진행"(2026-10-23). 5c P3 에서 국내 전망 챔피언 `kr-har-range@0.1.0` 이 풀링 실력 게이트를 4기간 통과했다 —
5b 에서 실력 감사 때문에 닫아 둔 화면을 연다. 국내 주식 상세 오른쪽 열에 코인 상세와 **같은** "자세히 — 변동 범위" 카드.

| 질문 | 결정 |
|---|---|
| 어느 영역이 움직이나 | **FE 만.** BFF `/api/app/coach/forecast` 는 심볼을 그대로 넘기고, 서버는 5b 부터 국내 코드(`X`)를 읽는다 — 계약 변경 0 |
| 같은 카드인가 | 같은 `ForecastCard` + 선택 prop `assetType`(기본 `crypto` — 코인 화면 무변경). 국내만 다른 문구 셋: 거래일 안내 · 보유 "주"(“이 주에 판다면”이 株와 겹쳐 “기간 끝에”) · 기준가 "개장 전 · 직전 거래일 종가" |
| 어디에 | 코인과 같은 접기 자리("자세히") · 거래 기록 위. 소유자 아님 · 비로그인 · 불러오는 중에는 자리도 없다(ADR-003) |
| 면책 | 카드 아래 서버 문장. 코인 상세는 코치 하단 띠에 있는데 국내 상세엔 그 띠가 없다 |

| 영역 | REQ | 몫 |
|---|---|---|
| 프론트 | `salt-microFe/requirements/specs/done/FE-REQ-041-F011-KR-STOCK.md` FR-23 | 카드 · 문구 |
| 기획 | `pm/requirements/specs/in-progress/FEATURE-011-kr-stock-kis.md` FR-83 · 슬라이스 표 5d | 완료 표시 · 영역 정정 |

## 판단 — 리뷰가 볼 곳

1. **prop 하나로 분기** — 국내 전용 카드를 따로 만들지 않았다(“같은 화면, 데이터만 다르다”). 숫자 · 게이트는 전부 서버 값
2. **서버에 자산군 필드를 추가하지 않은 것** — 화면은 라우트(`isKrStockCode`)로 이미 자산군을 안다. 응답에 넣으면 BFF · core 타입까지 3곳이 움직인다
3. **“자세히” 스타일 복제** — 위젯(`symbol-analysis`) 스타일을 페이지가 import 할 수 없어(FSD) 페이지 css 에 같은 값으로 둠

## 검증 · 미검증

`salt-microFe/requirements/reports/checklists/FE-REQ-041.md` §슬라이스 5d. 실데이터 렌더는 서버가 꺼져 국내 카드가 `stale_inputs` 라 미검증 —
서버 재기동 · `kr_daily` 다음 회차 뒤.

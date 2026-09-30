---
id: SLICE-F008-23-POSITIONING
title: "F008 슬라이스 23 — 쏠림 신호: 선물 펀딩비 · 김치 프리미엄 · 신호 뒤 과거 반응"
priority: high
labels: [F008, slice, forecast, db, server, bff, fe, contract]
created: 2026-09-27
---

## Summary

종목 상세에 "쏠림 신호" 카드가 생긴다. 선물 펀딩비가 지난 1년 중 어디쯤인지(상위 · 하위 N%)와 미결제약정 7일 변화,
김치 프리미엄과 3일 연속으로 확정된 부호, 그리고 **지금 이어진 신호**(지금 쏠림 · 20일 안의 0 교차) 뒤 과거 1 · 5 · 20일
반응 분포. 반응은 주요 사건(슬라이스 22)과 같은 함수 · 같은 게이트 · 같은 그림이다. 소유자 전용.

| 영역 | REQ | 이 슬라이스 몫 |
|---|---|---|
| 예측(Python) | `salt-forecast/requirements/specs/done/FC-REQ-007-F008-POSITIONING.md` | FR-1~8 — ECB 환율 · 상태 · 사건 · 반응 통계 · 일 배치 |
| DB | `salt-server/requirements/specs/in-progress/DB-REQ-029-F008-SCHEMA.md` | FR-16 · 17 — 표 2 · 뷰 2(추가만) |
| 서버 | `salt-server/requirements/specs/done/SRV-REQ-037-F008-FORECAST.md` | FR-11 — `GET /api/coach/positioning` |
| BFF | `bff/requirements/specs/done/BFF-REQ-037-F008-FORECAST.md` | FR-9 — 중계 · 막기만 하는 뷰모델 |
| 프론트 | `salt-microFe/requirements/specs/done/FE-REQ-038-F008-FORECAST.md` | FR-14 — 쏠림 신호 카드 · `ReactionDetail` 분리 |

## 사용자 결정 (2026-09-27)

- F009 슬라이스 0~7 이 끝나 로드맵 P2(F008 후속)로 넘어갔다. 넷 중 **과열 배지 + 김프**를 먼저(서버 포함)

## 판단 — 리뷰가 볼 곳

1. **"과열"을 판정하지 않는다** — 상태는 1년 백분위 구간 코드(≥ 0.9 · ≤ 0.1)이고 화면은 "통상 해석" 라벨로만 옮긴다. 판정 색 없음. 기획의 "과열 배지"를 이렇게 정정했다(FR-31 과 같은 선)
2. **원/달러를 ECB 로** — FRED 는 주 1회 공표라 최대 9일 늦다(그 사이 3.5% 움직였다 — 김프 크기와 같은 잡음). 새 외부 소스 하나(`security-sources.md` 한 줄)
3. **정의가 숫자를 정한다** — 백분위 중간 순위(동률 절반) · 0 교차 3일 연속 확정(확정일이 사건 시각) · 쏠림 14일 안 재진입은 같은 국면. 동률 처리 하나로 롱 쏠림 사건 수가 531 ↔ 734 로 움직였다
4. **반응 게이트 재사용** — Python `reaction` · `stats`, 서버 `toEventHorizon`, BFF `toHorizon`, 프론트 `ReactionDetail` 모두 주요 사건 것. 반응 통계는 기존 `event_reaction_stats` 에 kind 로 쌓았다(그 표엔 kind CHECK 가 없고 `v_event_card` 는 일정과 조인한다)
5. **미결제약정은 7일 변화만** — 이력 30일이라 백분위 · 급변 사건은 1년 뒤
6. **다중 비교** — 224종목 × 4 × 3. 조합별 게이트라 우연히 통과하는 조합이 있다. 분포는 "과거에 이랬다"이지 엣지 주장이 아니다(면책 · 판정 없음). CPCV · DSR 슬라이스에서 같이 본다

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 신호를 전망 피처로 | 채택은 채점이 정한다(FEATURE-008 FR-54) | 26주 라이브 재평가 |
| 미결제약정 백분위 · 급변 사건 | 이력 30일 | 2027-09(이력 1년) |
| 국면 카드 · ETF 유입 · CPCV · DSR | P2 의 나머지 | 다음 P2 슬라이스 |
| 김프 교차 알림 | 통제 · 알림 없음(측정 · 미러까지) | 요구가 생기면 PM |

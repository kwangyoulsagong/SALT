---
id: SLICE-F011-5B-KR-FORECAST-READ
title: "F011 슬라이스 5b — 국내 주식 전망 서버 읽기 · 국내 주식 σ · 실력 감사(화면 보류)"
priority: high
labels: [F011, slice, forecast, server]
created: 2026-10-09
---

## Summary

사용자 "확인 못한것들 다해줘"(2026-10-09). 슬라이스 5 의 미검증 항목을 닫고 5b(FR-83) 를 시작했다가, 사용자 질문
"대충한거야? 딥하게"에 답하려고 한 **실력 감사**가 국내 카드를 화면에 내보낼 근거가 없음을 보였다 → 화면은 열지 않고,
리서치로 정확도 스펙(`FC-REQ-020`, 슬라이스 5c)을 세웠다.

| 질문 | 결정 |
|---|---|
| 서버가 국내 행을 어떻게 아나 | 코드 모양으로 추측 안 함(6글자 코인 `PUNDIX`) — `KRW-X` · `X` 두 키를 묻고 걸린 행 키로 자산군 |
| 국내 봉 시각 | `open_time`(거래일 00:00 KST) → 도메인 규칙인 그날 00:00 UTC(+9h). 범위는 9시간 넓게 읽고 보정 뒤 가른다(실측 버그) |
| σ | 같은 EWMA · QLIKE · 같은 표, 연율 252 · 끊김은 거래일 달력 |
| 화면 카드 | **열지 않음** — 블록 순열 p≈0.26. 만든 화면 코드는 커밋하지 않고 되돌렸다 |
| 키 · 시간외 | 사용자 결정: KIS 모의 키 유지 · 시간외는 후순위(정규장 기준) |

| 영역 | REQ | 몫 |
|---|---|---|
| 예측 | `salt-forecast/requirements/specs/done/FC-REQ-009-F011-KR-STOCK.md` FR-9 · 실력 감사 절 | 국내 σ |
| 서버 | `salt-server/requirements/specs/in-progress/SRV-REQ-040-F011-KR-STOCK.md` FR-39 | 전망 읽기 |
| DB | `salt-server/requirements/specs/in-progress/DB-REQ-029-F008-SCHEMA.md` Changelog | `v_daily_close` `kis` |
| 다음 | `salt-forecast/requirements/specs/to-do/FC-REQ-020-F011-KR-FORECAST-ACCURACY.md` · `SRV-REQ-040` FR-40~47 | 정확도 · 나머지 기능 |

## 커밋

- `5891deb` feat(forecast) — 국내 σ
- `e6b9983` feat(server) — 전망 읽기 · 마이그레이션(뷰 행만 늘어남, 롤백 = 이전 정의)
- 문서 커밋

## 판단 — 리뷰가 볼 곳

1. **두 키 조회** — 모양 추측 대신. 비용은 `ANY` 키 2배(EXPLAIN 0.6ms)
2. **+9h 정렬** — 도메인 함수(시나리오 · 준수 · 미러)를 안 건드리는 대신 리더가 시각을 맞춘다. 종가 확정 시각은 실제보다 늦게 보여 보수적
3. **화면을 열지 않은 것** — 서버는 국내 카드를 소유자에게 준다(BFF 경유 200 / 비소유자 404 확인). 화면 연결은 `FC-REQ-020` 통과 뒤

## 검증 · 미검증

`requirements/reports/checklists/F011-slice5b-kr-forecast-read.md` · 회고 `requirements/reports/retrospects/F011-slice5b-kr-forecast-read.md`.

---
id: FC-REQ-027
feature: F016
area: forecast
kind: DATA
title: "등락 분해 β(국내 지수 · 업종 · 코인 BTC) · 설명 품질 평가 표본 · 지표"
priority: medium
created: 2026-11-06
source: pm/requirements/specs/in-progress/FEATURE-016-why-moved.md
---

## Summary

`FEATURE-016` FR-2 의 β 와 FR-11 의 평가. 예측 배치가 일 1회 β 를 내고(export 뷰로 서버가 읽는다), 평가 표본 · 지표 도구를 둔다. 시점 고정(`time-and-leakage.md`) — β 는 그날 이전 자료로만.

## FR

| FR | 내용 |
|---|---|
| FR-1 | 국내 β — 종목 × (소속 지수 · 업종 지수) 지난 120 거래일 일간 회귀(창 · 최소 표본은 설정). 표본 부족 = 행 없음(서버가 β=1) |
| FR-2 | 코인 — 기존 `v_realized_vol.btc_beta`(90일) 재사용. 새 계산 0 |
| FR-3 | export 뷰 `forecast.v_move_beta_export`(종목 · 자산군 · 지수 β · 업종 β · as_of · 표본 수) — 사용자 열 0 |
| FR-4 | 평가 표본 — 지난 1년 큰 등락일(국내 · 코인 각 N, 카드 조건과 같은 규칙) 추출 · 사람 표시 양식(사실 목록 + 문장 → 충실 · 인과 단정 · 지어냄) |
| FR-5 | 지표 — 인용 충실도 · 인과 단정 0 비율 · "소식 없음" 정직률 · 소식 매칭 비율 · 분해 몫 분포(시장 몫이 지배적인 날 비율). 리포트 `reports/move-explain-*.md` |
| FR-6 | ~~사전 등록 — ③ 켜기 문턱을 평가 전에 적는다~~ **2026-11-06 사용자 결정**: 켜기 조건이 아니다 — 운영 중 주간 리포트(충실도 · 정직률)와 "나빠짐" 기준만 적는다(끄기 판단용) |

## Acceptance Criteria

- [ ] β 시점 고정 테스트(as_of 다음 날 자료 0)
- [ ] 뷰가 사용자 열 0 · 서버 계정 읽기 권한만
- [ ] 평가 리포트 한 번 — 국내 · 코인 표본 · 문턱 대비 결과

## 계약 영향

- 서버 `SRV-REQ-051`(β 읽기) · `SRV-REQ-052`(켜기 조건) · DDL 주인(`ADR-007` — S5 전 `salt-server/prisma`)

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-06 | 신규(to-do) |
| 2026-11-06 | 사용자 결정 — 평가는 켜기 문턱이 아니라 운영 모니터링 |

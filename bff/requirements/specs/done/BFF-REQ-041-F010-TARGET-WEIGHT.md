---
id: BFF-REQ-041
feature: F010
area: bff
kind: API
title: "F010 슬라이스 5 — 목표 비중 안내 중계 · 3종 고지 게이트 · 투자금 칸"
priority: high
created: 2026-09-29
source: requirements/reports/research/2026-09-27-ai-judgment-upgrade.md §4-3 6 · §9-4 · §10 슬라이스 5
---

## Summary

서버 `GET /coach/target-weights`(`SRV-REQ-024` FR-182~186)를 `/api/app/coach/target-weights` 로 옮긴다. 금액 · 비중 · 판정은 서버 값 그대로 —
BFF 는 **3종 고지가 다 붙었는지**만 막는다. 리스크 예산 PUT 에 투자금 칸을 통과시킨다.

> 번호: `BFF-REQ-040` 은 F011(국내 주식)이 예약했다. 이 REQ 의 첫 커밋 메시지(`d04bbd2`)에는 040 으로 적혀 있고 `11e7a65` 에서 코드 주석을 고쳤다.

## 결정

1. **고지가 빠지면 비중도 없다.** 과거 성적(규칙 · BTC 보유 CAGR · MDD · 상승 포착) · 실패 사례(놓친 상승 · 잃은 달 각 1건 이상) 중 하나라도
   없으면 `blocked: disclosure_missing`. 행에 σ(근거)가 없으면 그 행을 뺀다. 남은 행이 없으면 `blocked: no_volatility`
2. **주장은 서버만** — `claims` 는 `=== true` 만 참. 모르면 거짓("덜 빠졌다"를 말하지 않는다)
3. `orderExecution !== false` 면 계약 깨짐 → 200 `unavailable`(주문 경로가 없다는 서버 선언이 없는 응답을 화면에 싣지 않는다)
4. 알 수 없는 `status`(부족 · 초과 · 맞음 밖) · 0~1 밖 비중 행은 뺀다 — 0 으로 채우지 않는다

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | `GET /api/app/coach/target-weights` — 서버 중계(1,500ms · 재시도 1회 · 화면 떠나면 취소). 5xx · 타임아웃 · 계약 깨짐 → 200 `unavailable`, 4xx 그대로 | 완료 |
| FR-2 | 뷰모델 `target-weight.viewmodel.ts` — 결정 1~4. 기록은 `strategy`(CAGR · σ · MDD · 상승 포착 · 평균 노출) · `holdBtc`(CAGR · MDD) · `claims` · 실패 사례 · 기간 · 등록 키 · 수수료만(고정 비중 곡선 · CI 는 화면이 쓰지 않는다) | 완료 |
| FR-3 | `PUT /api/app/coach/risk-budget` 허용 키에 `investableCapital` · 응답 `settings.investableCapitalKrw`(0 이하는 `null`) | 완료 |
| FR-4 | (target-weight@2) 행 `status` 에 `no_room` · `gapCapped`, `excluded.reason` 에 `no_record` · `currentValueKrw`, 합계 `outsideRuleWeight` · `fundableKrw` 를 옮긴다. 알트 비중은 어디에도 없다 | 완료 |
| FR-5 | `altShare` — 등록 키 · 채택값(`null` = 채택 없음) · 후보별 ΔCalmar 셋 · CAGR · 생존 편향. 키나 후보가 없으면 `null`(알트 근거 문장을 쓰지 않는다) | 완료 |
| FR-6 | `live` · `recordSource` — 서버가 `live` 라고 하고 라이브 요약이 온전할 때(`nWeeks ≥ 30` · 누적 · 낙폭 두 쌍 · 실패 주 1건 이상)만 `live`. 서버 문턱이 30 보다 작아도 30 아래로 내리지 않는다(등록 [live.display]) | 완료 |
| FR-7 | **재료 정지**(F010 슬라이스 7, `SRV-REQ-024` FR-196) — `renderable: false` 의 서버 `blockedReason` 중 `stale_inputs` 만 옮기고 모르는 값은 지금처럼 `no_volatility`. 타입 `TargetWeightBlockedReason`(`no_volatility` · `stale_inputs` · `disclosure_missing`) | 완료(`1efb44d`) |

## Changelog

- 2026-09-29: 초판 · FR-1~3 완료(`d04bbd2` · 번호 정정 `11e7a65`)
- 2026-09-29: FR-4~6 — target-weight@2 알트 규칙 밖 · 라이브 원장(`ae69599`)
- 2026-10-07: FR-7 — 재료 정지 `stale_inputs`(F010 슬라이스 7, `1efb44d`)

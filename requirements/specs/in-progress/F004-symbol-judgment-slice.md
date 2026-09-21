---
id: SLICE-F004-SYMBOL-JUDGMENT
title: "F004 슬라이스 1 — 종목 판단 스냅샷 · 사후 판정 · 3종 게이트 (서버)"
priority: high
labels: [F004, slice, server, coach, judgment, render-gate]
created: 2026-09-21
---

## Summary

**투자 우측 AI 코치 패널 ②(지금의 판단)가 3종 게이트를 통과할 근거를 서버가 쌓기 시작한다.**
종목 판단은 요청 때 계산하고 버려서 성적표 표본이 영원히 0이었다. 판단을 스냅샷으로 남기고,
관찰 기간이 지나면 결과를 매기고, 화면 응답에 모드별 게이트 · 성적표 · 실패사례를 싣는다.

## Background

- 감사 문서 D11(Q5) · B39(2026-09-21 사용자 확정): 실패 이력은 스냅샷 사후 결과에서 오고
  `IndicatorTrackRecord` 를 쓰지 않는다. 관찰 기간 단타 24시간 · 장기 30일, 관찰 기간당 1표본.
- 서버만 움직인다. 응답은 **필드 추가**이고 BFF 가 옮기는 `confidence` 하나만 빠진다 —
  BFF `mapDecision` 은 `undefined` 를 옮기게 되고 프론트는 그 필드를 쓰지 않는다(grep 0건).

## 범위

| REQ | FR | 내용 |
|---|---|---|
| `SRV-REQ-024` | FR-100~107 · FR-131 · FR-132 · FR-134~137 | 두 모드 · 중립 라벨 · **신뢰도 제거** · `validity.code` · 모드별 게이트 · 스냅샷 · 사후 판정(B39) · 표본 독립성 · `insufficient_sample` |
| `SRV-REQ-025` | FR-40~43 · FR-45 · FR-47 | `modes.*` · `disclaimer` · `confidence` 제거 |
| `DB-REQ-017` | FR-50~53 (**다르게**) | 별도 테이블 `SymbolJudgmentSnapshot` |

## 판단 — 리뷰가 볼 곳

1. **스냅샷을 `InvestmentInsight` 에 섞지 않았다.** 그 테이블은 피드 · 대시보드 · 점수 계산이
   타입 필터 없이 읽는다(`findActiveForScoring` 등). 섞으면 판단 행이 그 화면들로 쏟아진다.
2. **판단은 사용자와 무관하다** — `makeModeDecision` 은 `hasHolding` 을 받지만 점수에 쓰지 않는다.
   그래서 종목 · 모드당 한 벌이고 사용자 열이 없다. 추적 자산은 전 사용자 관심 ∪ 보유(크립토).
3. **표본 독립성을 쓰는 시점에 강제한다.** 10분 워커가 돌아도 관찰 기간이 지난 조합만 쓴다.
   행 하나 = 표본 하나라서 성적이 SQL 집계 한 번이다.
4. **성적은 판단 유형 전체(`<mode>.<action>`)의 것이다** — 종목 하나의 것이 아니다. 종목
   하나로는 장기 판단 20표본에 1년 반이 걸린다. 실패사례에 다른 종목이 보일 수 있다.

## 범위 밖 (다음 슬라이스)

| 항목 | 언제 |
|---|---|
| `zone`(보유 규칙 가격 · 관찰 구간, `SRV-REQ-024` B절) | 슬라이스 2 |
| `gaugeTrackRecords`(게이지 적중률, C절 · `GaugeTrackRecord`) | 슬라이스 2 |
| BFF 뷰모델(`BFF-REQ-023/024`) · 프론트 패널(`FE-REQ-026` K절) | 서버 계약이 다 선 뒤 |
| `defaultMode` 컬럼(FR-48) · 저장 추천 경로 성적 · 해설 게이트(E절) | F004 후속 |
| 주식 판단 | 자산군 결정(Q2) 이후 |

---
id: SLICE-F004-ZONE-GAUGE
title: "F004 슬라이스 2 — zone(보유 규칙 가격 · 관찰 구간) · 게이지 적중률 (서버)"
priority: high
labels: [F004, slice, server, coach, zone, gauge]
created: 2026-09-21
---

## Summary

**투자 우측 AI 코치 패널의 ③(구간)과 게이지 아래 한 줄이 쓸 값을 서버가 낸다.**
종목 응답 `modes.*` 마다 `zone` 이, 응답 최상위에 `gaugeTrackRecords` 가 붙는다. 둘 다 **과거
값과 사용자의 규칙**이고 예측이 아니다 — 수익률 · 목표가 · 확률 필드가 없고 거리는 금액뿐이다(D13).

같은 브랜치에 슬라이스 1 의 열린 판단 하나를 닫았다: **피하기는 `risks` 도 근거로 센다**
(`SRV-REQ-024` FR-138, 2026-09-21 사용자 확정).

## 범위

| REQ | FR | 내용 |
|---|---|---|
| `SRV-REQ-024` | FR-138 (신규) | 피하기 근거 = `reasons ∪ risks` |
| `SRV-REQ-024` | FR-110~116 | `zone` — `held_rule` · `observation` · `unavailable` |
| `SRV-REQ-024` | FR-120~123 | `gaugeTrackRecords` — `sentiment` 만 |
| `SRV-REQ-025` | FR-44 · FR-46 | 응답 계약 |
| `DB-REQ-017` | FR-55 · FR-57 | `GaugeTrackRecord` 테이블 · 구간 폭은 데이터 |

## 판단 — 리뷰가 볼 곳

1. **보유 규칙 가격은 익절 계획과 같은 함수다**(`calculateProfitPlan`). 두 화면이 다른 손절선을
   말하지 않는다. 그래서 `toFixed(2)` 반올림도 그대로 따라온다 — 1원 미만 코인에서는 거칠다.
2. **관찰 구간의 최소 표본 = 기대 캔들 수의 절반**(단타 144/288 · 장기 183/365). 상장 직후 몇십
   개 캔들로 만든 "1년 분포"를 내지 않는다. 기준값은 REQ 에 없어 이 슬라이스가 정했다.
3. **게이지 집계를 `market` 이 한다.** 원천(심리 · 종가)이 둘 다 `market` 테이블이라 `coach` 는
   공개 API 로 결과만 받아 `gauge_track_records` 에 쓴다. 하루 1표본 · 진입과 청산 모두 "그 시각
   이후 첫 일봉 종가"라 간격이 정확히 30일이다.
4. **국내 주식을 가리지 못한다.** 자산군 enum 이 `crypto` · `stock` 뿐이라 미보유 주식은 전부
   `out_of_scope` 이고 `excluded_asset` 은 나오지 않는다(`DB-REQ-003` 이후).

## 범위 밖

| 항목 | 언제 |
|---|---|
| `smart_money` 게이지(FR-124 · `DB-REQ-017` FR-56) | Should — 같은 계약으로 뒤에 |
| 구간 스냅샷 `smart_buy_zone`(FR-117) | Should — 구간 진입 후 결과 세기가 필요해질 때 |
| `assetType` · FR-48 `defaultMode` · `preview` 에서 zone 생략(FR-49) | F004 후속 |
| BFF(`BFF-REQ-023/024`, `mapDecision` 의 `confidence`) · FE 패널(`FE-REQ-026` K절) | 다음 슬라이스 |

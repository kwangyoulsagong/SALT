---
id: SLICE-F006-MARKET-SUMMARY
title: "F006 슬라이스 1 — 투자 화면 시장 요약 띠 (서버 · BFF · FE)"
priority: high
labels: [F006, slice, server, bff, fe, market, design]
created: 2026-09-22
---

## Summary

투자 화면 제목 아래에 시장 요약 띠(대표 1 + 작은 항목 6, 영역 스파크라인)를 둔다. **무엇을 보여 줄지 · 태그 · 등락 금액은
서버가 정한다.** 사용자 요청(참고 화면 상단 띠의 코인 버전)과 지적 두 번("서버에서 줘야지", "디자인 별로")에서 나왔다.

## 범위

| REQ | 영역 | 내용 |
|---|---|---|
| `SRV-REQ-036` | 서버 | `GET /api/investment/market/summary` — 설정 종목 · `wide_move` · 등락 금액 · 5분봉 1분 캐시 |
| `BFF-REQ-035` | BFF | `/api/app/market/summary` 뷰모델 · WS `price_update.change24hAmount` |
| `FE-REQ-037` | FE | 띠 UI · `@repo/ui` Sparkline `area` · `baseline` |
| `FEATURE-006` | PM | FR-64~67 |

영역을 넘는 이유: **계약 변경**(새 경로 · WS 필드)이다(`pr-convention.md` §7).

## 판단 — 리뷰가 볼 곳

1. **요약 대상 = 서버 설정**(`MARKET_SUMMARY_SYMBOLS`). 거래대금 · 상승률 순위로 고르지 않는다 — 항목이 틱마다 자리를 바꾸거나 "오르는 종목 모음"이 된다
2. **태그는 방향을 말하지 않는다**(`wide_move` → `변동 큼`) — 참고 화면의 "급상승 · 급하락"을 옮기지 않았다
3. **등락 금액은 변동률로 기준가를 되짚는다**(서버 도메인). 첫 값은 저장 시세 기준이라 거래소 값과 조금 다를 수 있고 WS 가 덮는다

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 사유 태그 · 지수 · 환율 · 주요 일정 | 서버 소스 없음 | 서버 명시 · Q2/Q7 |
| 요약 전용 가격 배경 갱신 | WS 가 곧 덮는다 | 관찰 후 |

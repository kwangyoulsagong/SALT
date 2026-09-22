---
id: SLICE-F004-SERVER-EXPLAIN-PREFLIGHT
title: "F004 슬라이스 10 — 서버 explain 인증 · 게이트 · abort, preflight 손절 칩"
priority: high
labels: [F004, slice, server, fe, contract]
created: 2026-09-22
---

## Summary

프론트 두 곳을 막던 서버 계약을 연다. **즉석 해설**은 공개 경로였고 판단이 막혀도 LLM 을 불렀으며 화면을 떠나도 끝까지 돌았다.
**주문 전 체크**는 손절 칩(%)을 받지 못해 프론트가 가격으로 환산해야 했다 — 공통 수용 기준 3 위반이라 화면을 못 만들었다.
해설 응답이 합 타입이 돼 프론트가 짝으로 바뀐다(계약 변경이라 한 PR).

## 범위

| REQ | FR | 내용 |
|---|---|---|
| `SRV-REQ-025` | FR-11 · 12 · 14 · 19(부분) · 20 · 32 · 50 · 51 · 52 | explain 인증 · 게이트 먼저 · abort · 뉴스 요약 상한, preflight `stopLossRate` · `maxLossOfTotalRate` |
| `FE-REQ-026` | FR-135(유지) | 해설 `renderable:false` 수신 |
| (규칙) | — | `ddd-domain.md` `judgmentGate` · `ddd-shared.md` `ErrorKind.Unauthenticated` |

## 판단 — 리뷰가 볼 곳

1. **게이트를 해설 경로에서 다시 판정한다** — 화면 게이트와 같은 함수. 요청마다 판단 재료를 한 번 더 모은다(LLM 앞이라 비용 대비 작다)
2. **면책을 판단 경로 문장으로 바꿨다** — 모델이 쓴 면책을 버린다
3. **`maxLossOfTotalRate` = `maxLossRate`** — 이름만 더했다

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 코치 리포트 · scoreboard · generation-status · generate 202/429 · `defaultMode` | 신규 경로 · 스키마 변경(`DB-REQ-017` FR-20) | 다음 서버 슬라이스 |
| 차트 키 통일 · `to` · 주/월/년 · 응답 요동 | 시세 컨텍스트 | 시세 서버 슬라이스 |
| 주문 전 체크 화면(FR-150~156) | 이 계약 위의 FE 작업 | 다음 FE 슬라이스 |

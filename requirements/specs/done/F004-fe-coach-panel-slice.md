---
id: SLICE-F004-FE-COACH-PANEL
title: "F004 슬라이스 4 — 투자 우측 AI 코치 패널 (FE)"
priority: high
labels: [F004, slice, fe, coach, panel, render-gate]
created: 2026-09-22
---

## Summary

**슬라이스 3 의 `GET /api/app/ai-coach/detail`(`SymbolCoachViewModel`)을 투자 화면 우측 패널에 그린다.**
시세 프리뷰(`MarketPreview`)는 그대로 두고, 차트와 게이지 사이에 ① 모드 스위치 ② 지금의 판단 ③ 내 규칙
가격 / 관찰 구간을, 게이지 아래에 적중률 한 줄을 끼운다. 지금 로컬 데이터는 전부 `insufficient_sample` 이라
**막힌 상태(`BlockedNotice`)가 주 화면**이다.

## 범위

| REQ | FR | 내용 |
|---|---|---|
| `FE-REQ-026` | FR-1~3 · FR-5 · FR-10~14 · FR-110~118 · FR-120 · FR-121 | 패널 조립 · 게이트 · 모드 스위치 · 구간 · 게이지 한 줄 |
| `FE-REQ-028` | FR-80~83 · FR-85 · FR-89 | 클라이언트 조회 · 쿼리 키 · 취소 · 모드 전환 무요청 · 타입 `packages/core` |
| `FE-REQ-029` | FR-70~72 · FR-75 | 취소 · 모드 전환 · 스켈레톤 높이 · `"use client"` 범위 |
| `BFF-REQ-024` | FR-30 | 뷰모델 타입 `@repo/core/coach` |

## 판단 — 리뷰가 볼 곳

1. **위젯이 위젯 안에 들어간다.** 패널(`widgets/coach-panel`)은 시세 보드(`widgets/market-board`)의 우측
   칸이다. 같은 레이어 cross-slice 를 피하려고 `market-board` 가 `renderPreview` 슬롯을 열고
   **`pages/investments` 가 주입**한다(`fsd-widgets.md` `pc-panel-grid` 와 같은 방식). `MarketPreview` 도
   `coachSlot` · `gaugeFooters` 슬롯만 연다 — `market` 이 `coach` 를 모른다
2. **모드는 URL `?mode=` 이고 `history.replaceState` 로 바꾼다.** REQ 의 `router.replace` 는 RSC 를 다시
   요청해서 "모드 전환 요청 0건"과 부딪힌다. 실측 0건
3. **판단 쿼리는 이전 데이터를 유지하지 않는다.** 시세 프리뷰는 `keepPreviousData` 로 깜빡임을 막지만, 판단은
   그러면 **다른 종목의 판단이 새 종목 이름 아래 보인다.** 대신 같은 높이의 스켈레톤
4. **타입은 두 벌이다.** `@repo/core/coach` 는 BFF 타입 절의 사본이다 — BFF 는 workspace 밖이라 import
   할 수 없다. 바꿀 때 두 파일을 같이 연다(파일 머리에 적었다). 리터럴 union 은 BFF 원본을 따랐다
   (`layered-architecture.md` §6 enum 규칙과 어긋남 — 회고)
5. **`SegmentedControl` 을 `@repo/ui` 에 새로 넣었다.** REQ 가 이름으로 부르는데 없었다. FR-121 이
   `radiogroup` 을 요구해서 `FilterTabs`(`aria-pressed` 버튼 묶음)로는 안 된다 — 같은 스타일에 roving tabindex
6. **패널은 `next/dynamic` 이다.** 정적으로 부르면 `@/entities/market` barrel 이 첫 로드에 들어온다.
   `/investments` First Load 135 kB → 135 kB(페이지 8.28 → 8.45 kB)

## 범위 밖

| 항목 | 언제 |
|---|---|
| ⑦ [상세 분석 보기](FR-119) | 이동할 `/investments/[symbol]` 이 없다 — L절 상세 페이지 슬라이스 |
| 상세 분석 · 주문 전 체크 · 해설(L절 · FR-130~156) | 다음 FE 슬라이스 |
| 코치 리포트(M절) | BFF `/coach/report` 이후 |
| 쿠키 인증(FR-80) | `FE-REQ-013` — 지금은 `localStorage` 토큰(관심 목록과 같다) |

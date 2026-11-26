---
id: FE-REQ-062
feature: F000 · F012 · F013 · F015
area: frontend
kind: UI
title: "화면 움직임 — 호버 · 눌림 · 등장 · 스켈레톤 · 숫자 · 차트 그리기를 전 화면 같은 값으로(기준 앱 수준)"
priority: medium
created: 2026-11-04
source: 사용자 "우리도 ○○처럼 애니메이션 넣어야돼"
---

## Summary

`FE-REQ-044`(done)는 **상태 그래픽 · 장면 일러스트 · 누름/숫자/등장** 컴포넌트를 만들었다. 빠진 것은 **화면 전체의 손맛** — 목록 행 · 카드 · 탭 · 칩이
마우스와 데이터 도착에 반응하는 짧은 전환이다. 2026-11-04 1440 측정: 가계부는 누를 수 있는 요소 25개 중 전환이 **1개**, 저축 11개 중 4개
(그중 진척 막대는 `width` 애니메이션 — `motion.md` §5 금지), 투자는 230개가 `transition: all 0.1s`(모든 속성을 따라가는 `all` — 성능 규칙 밖).
기준 앱 공개 화면(1440)은 전환이 **값 몇 개로 통일**돼 있다 — 아래 표. 새 값을 지어내지 않고 우리 `motion` 토큰에 대응시킨다.

## 측정 — 기준 화면 전환 · 키프레임(2026-11-04, 공개 홈 1440)

| 쓰임 | 기준 값 | 개수 | 우리 토큰 대응 |
|---|---|---|---|
| 행 · 카드 · 버튼 호버 면 | `background, box-shadow 0.2s ease` | 224 | **새 토큰 `duration.hover` 0.2**(결정 2026-11-04) |
| 글자색 호버 | `color 0.1s ease` | 106 | `duration.instant`(0.12) |
| 작은 컨트롤(칩 · 탭) | `background-color / color 0.15s ease` | 6 | `duration.instant` |
| 투명도 전환 | `opacity 0.15~0.2s ease` | 4 | `duration.instant` · `base` |
| 펼침 · 미끄러짐 | `transform 0.3s ease-out` · `background 0.3s ease-out` | 12 | `duration.slow`(0.4) 보다 짧다 — `base` |
| 등장 | `opacity 0 → 1` · `opacity .3 + scale(.96) → 1` | 키프레임 | `enterReveal` 와 같은 뜻(이동 8px 대신 크기 .96) |
| 스켈레톤 | 배경 위치 `150% → -50%` 반짝임 | 키프레임 | 지금 `Skeleton` 확인 — 없으면 더한다 |
| 차트 · 지수 타일 | `2000ms cubic-bezier(.25,.1,.25,1)` 한 번 | 6 | 차트 선 그리기 · 숫자 흐름 — **한 번만**(`motion.md` §4-1) |
| 실시간 점 | `1500ms linear` 무한 | 4 | 실시간 표시만(진행 중 무한 반복 허용 자리) |
| 로딩 | 원 회전 + 선 길이(`stroke-dashoffset`) | 키프레임 | `Spinner` 그대로 |

## FR

| FR | 내용 |
|---|---|
| FR-1 | **호버 · 포커스 면** — 누를 수 있는 행 · 카드 · 타일 · 칩 · 탭 전부: 배경 `duration.hover` 0.2s · 글자색 `instant`. `transition: all` 금지 — 바뀌는 속성만 적는다(투자 230곳 교체). 포커스 링은 지우지 않는다 |
| FR-2 | **눌림** — 버튼 · 칩 · 행 `scale(.97)` `instant` + `spring.snappy`(이미 `@repo/ui` 일부 — 빠진 컴포넌트에 더한다) |
| FR-3 | **등장** — 패널 · 카드 · 목록이 데이터와 함께 올 때 투명도 + 크기 .96 → 1 `base` `easing.enter` 한 번. 목록 행은 차례(행당 20ms, 최대 8행까지만 — 그 뒤는 같이). 서버 HTML 은 마지막 프레임(`motion.md` §6) |
| FR-4 | **스켈레톤 반짝임** — 행 모양 스켈레톤(`FE-REQ-060` FR-13)에 반짝임 한 줄. 줄인 모션이면 반짝임 없이 옅은 면 |
| FR-5 | **숫자** — 요약 띠 주인공 숫자(가계부 쓴 돈 · 저축 모은 돈 · 홈 카드 값)는 값이 바뀔 때 `NumberText` 굴림(`base`). **가격 · 등락률은 굴리지도 깜빡이지도 않는다**(사용자 결정 2026-09-30 그대로) |
| FR-6 | **막대 · 진척 · 봉투 · 착지 구간** — `width` 애니메이션을 `transform: scaleX()`(원점 왼쪽)로 바꾼다(저축 진척 막대 · 가계부 봉투 막대). 처음 보일 때 0 → 값 `slow` 한 번 |
| FR-7 | **차트 선 그리기** — 차트가 처음 그려질 때 선이 왼쪽에서 오른쪽으로 한 번(캔버스는 클립 사각형을 넓혀 가며 rAF, `canvas.md`). 실시간 갱신 때는 다시 그리지 않는다 |
| FR-8 | **탭 · 세그먼트 · 알약 탭** — 선택 면이 옮겨 갈 때 `transform` 으로 미끄러짐 `base`(지금 일부만) |
| FR-9 | **페이지 사이** — 같은 zone 안 이동은 본문만 투명도 `base`, zone 사이는 문서 간 전환 그대로(`FE-REQ-054`) |
| FR-10 | 값은 전부 `@repo/tokens` `motion` — 컴포넌트에 숫자 0. 새 토큰(`duration.hover`)을 두면 `motion.md` §3 표에 행을 먼저 |

## 지키는 것

- `transform` · `opacity` 만 애니메이션(`width` · `height` · `box-shadow` 애니메이션 0 — 기준은 그림자 전환을 쓰지만 우리는 그림자 카드가 없다)
- 한 화면에 동시에 움직이는 장면은 하나 · 무한 반복은 진행 중(로딩 · 실시간 점)에만 · 줄인 모션 존중
- 수익 · 매매 결과 축하 0 · 판정 카드 맥박 0(`motion.md` §8)
- 가격 깜빡임 · 숫자 굴림 0

## ~~결정 필요~~ 결정 2026-11-04

- 호버 = **새 토큰 `duration.hover` 0.2s**(사용자 "베스트 케이스") — 기준 값이 0.2 로 220곳 넘게 통일돼 있다. `motion.md` §3 표에 "신설 예정" 행을 먼저 넣었다

## 결과 (2026-11-26 done)

| FR | 무엇을 했나 | 어디 |
|---|---|---|
| FR-1 | 옛 `vars.transitions`(속성 없이 → `all`) 지움 · `HOVER_TRANSITION`(면 `hover` 0.2 · 글자색 `instant`) 한 벌 · 데스크톱 전역 `:where()` 바닥값(특이도 0 — 컴포넌트 값이 이긴다). 전환 있는 비율 44% → 100%(668 → 669 중 669 — 가계부 날마다 막대 4개는 `all: unset` 이 지워 따로) · `all` 180 → 0 · 레이아웃 속성 전환 2 → 0 | `@repo/ui/transition` · `@repo/web-shared/layout/globals.css` |
| FR-2 | 버튼(옛 아래로 1px · 안쪽 그림자) · 아이콘 버튼 · 목록 행에 누름 0.97, 데스크톱 전역 버튼 · 접힘 머리 바닥값 | `@repo/ui/press` |
| FR-3 | 본문 목록 행 · 표 행 차례 등장(투명도 + .96 · `base` · 행마다 20ms · 8행 넘으면 같이) — 전역 한 곳 | `globals.css` · `enterRow` |
| FR-4 | 스켈레톤 반짝임 한 줄 — `::after` 띠를 `transform` 으로(배경 위치 이동 0) · 줄인 모션이면 옅은 면 | `Skeleton` |
| FR-5 | 요약 주인공 금액이 바뀔 때 굴림 — 포맷된 글자를 숫자로 나눠 굴리고 같은 모양으로(`RolledText`) · 가격 · 등락률 0 | `SummaryBand` · `MobileSummary` · 홈 카드 |
| FR-6 | `ProgressBar` 값 = `scaleX`(옛 `width` 전환) · 막대 열한 곳 처음 차오름(`growInX` · `growInY` — 크기는 값 그대로, `transform` 만) | `@repo/ui/enterReveal` |
| FR-7 | `Sparkline` · `PreviewChart` = 바깥 `<svg>` `clip-path: inset()` 넓힘(안쪽 사각형 `scaleX` 는 레이아웃 70 → 248 이라 버림) · `TradingChart` = 기본 캔버스 오른쪽을 덜 지우며 rAF. 처음 한 번 · 실시간 갱신 다시 0 | `chartReveal` · `engine/reveal.ts` |
| FR-8 | `FilterTabs` 세 변형 미끄러짐(`useSlidingIndicator`) · 시세 표 필터가 대기 분기에 갈아 끼워지던 것 고침 | `FilterTabs` · `RealtimeMarketTable` |
| FR-9 | `RouteMain` — 경로가 바뀔 때만 본문 투명도 `base`(첫 마운트 · `?tab=` 0) | `@repo/web-shared/layout` |
| FR-10 | 토큰 `duration.hover` · `loop` · `easing.standard` · `staggerRow` — `motion.md` §3 표 · 3-1 바닥 표 · 기계 검사 `motionBudget.test.ts` | `@repo/tokens` |

## 검증 계획

- 화면마다 누를 수 있는 요소 중 전환 있는 비율(이번 측정 스크립트) — 목표 100% · `transition: all` 0
- Performance 패널에서 호버 · 등장 때 Layout · Paint 0(transform/opacity 만) · 60fps
- 줄인 모션에서 이동 · 크기 0 · 투명도만

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-04 | 신규(to-do) — 기준 공개 화면 전환 · 키프레임 실측, 우리 세 화면 전환 비율 실측 |
| 2026-11-04 | 결정 — 호버 토큰 `duration.hover` 0.2s 신설(사용자 "베스트 케이스"). 적용은 단계마다 그 화면에(D1~D4) |
| 2026-11-26 | to-do → **done**(`feat/fe-req-062-interaction-motion`, 사용자 "다음 파이프라인" — §4-1 남은 칸 셋 중 고름). FR-1~10 위 결과 표. 측정 · 실화면은 `checklists/FE-REQ-062.md` |
| 2026-11-26 | 정정 — **카드 · 패널 등장은 `enterReveal` 그대로**(8px 떠오름 · `slow` — 위 측정 표가 "같은 뜻"으로 대응시킨 값, 휴대폰 `mobile-motion.md` §3 과 한 벌). 투명도 + .96 · `base` 는 **목록 행**에(FR-3) — 행은 배경이라 더 짧고 작게 |
| 2026-11-26 | 정정 — FR-6 "처음 보일 때" → **처음 그릴 때**(CSS 애니메이션 — 서버 HTML 도 끝 상태). 막대는 서버 컴포넌트 안이 많아 보임 관찰을 붙이면 잎마다 클라이언트가 된다 · 화면 밖 CSS 애니메이션은 칠하지 않는다 |
| 2026-11-26 | 정정 — FR-7 길이는 기준 2000ms 가 아니라 `duration.scene` 0.9s(`motion.md` §4-1 "한 장면은 1초 안") · 곡선은 기준과 같은 `ease`(`easing.standard`) |
| 2026-11-26 | 정정 — FR-1 · 2 · 3 은 화면마다 붙이지 않고 데스크톱 전역 `:where()` 한 곳(행을 그리는 자리 80곳 가까이 · 전환 없는 링크 372개 — 컴포넌트마다 붙이면 다음 화면에서 다시 빠진다). 휴대폰 `/m` 은 `MobileShell.css.ts` 그대로 |

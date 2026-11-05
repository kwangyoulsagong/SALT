---
id: FE-REQ-050
feature: F011
area: frontend
kind: UI
title: "국내 주식 탭 요약 띠를 코인과 같게 — 대표 지수 · 작은 칸 9 · 오늘의 시장"
priority: high
created: 2026-10-30
status: done (2026-11-02)
source: 사용자 스크린샷(국내 탭 코스피 · 코스닥 큰 상자 두 개) · "국내주식도 … 코인처럼 똑같이 해야하고"
---

## Summary

국내 탭은 지금 `KrIndexStrip` → `KrIndexSummary`(코스피 · 코스닥 상자 2개, 각 화면 절반 폭)다. 코인 탭의 `MarketSummaryStrip`
(대표 + 3×3 + 오늘의 시장)과 **같은 컴포넌트**를 데이터 소스만 바꿔 쓴다 — `market-board` 의 원칙("자산군은 데이터 소스만 바꾼다")을 요약 띠까지.

> **구현 2026-11-02** (`feat/kr-market-summary` `8beed38a`). 검증 `salt-microFe/requirements/reports/checklists/FE-REQ-050.md`(실화면 3000 · 1600 폭).

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | `MarketSummaryStrip` 이 `assetClass` 를 받아 코인 · 국내 요약 조회를 고른다. 국내는 `GET /api/app/market/kr/summary`(`BFF-REQ-044`) | **완료** — 두 조회 훅을 늘 부르고 한쪽만 켠다(훅 순서 고정). 보드는 자산군 문자열만 넘긴다(엔티티 barrel 을 값으로 끌어오지 않게) |
| FR-2 | 칸 링크 — 종목은 `/investments/{코드}`, 지수 · 환율 칸은 링크 없음(셰브론 없음) | **완료** — 지수 칸은 같은 모양의 `span`, 호버 면도 링크에만(`a&:hover`) |
| FR-3 | 등락 표기 — `changeBasis: prev_close` 면 "전일 대비" 라벨(코인은 24시간) | **완료** — 금액 칸 설명 · 오늘의 시장 머리 · 막대 설명이 기준으로 갈린다. 선 이름은 "오늘 장중"(지난 거래일이면 "10/31 장중") |
| FR-4 | 오늘의 시장 상자 — 상승 · 보합 · 하락 막대 + **다가오는 국내 일정 3건**(날짜 · 종류 · D-day). 일정 0건이면 소식 줄 자리를 숨긴다 | **완료** — 뉴스 행과 같은 높이 · 종류 이름은 `@repo/core` `EVENT_KIND_LABELS`, D-day 는 서버 `daysUntil` 그대로 |
| FR-5 | 머리 띠(`judgment-overview` — 목표 비중 · 위험 · 판정 성적표)도 국내 탭에 — 성적표는 `kr_stock.` 그룹만, 목표 비중 칸은 국내 값이 없으면 칸을 숨긴다(코인 숫자를 국내 탭에 두지 않는다) | **완료** — 목표 비중은 BTC · ETH 값뿐이라 국내 탭엔 칸 없음(두 칸 같은 폭). 위험 칸은 **보유 전체**(서버 `RISK_ASSET_TYPES` = 코인 + 국내)라 두 탭에 같고 국내 탭에선 BTC 동조 줄만 뺀다 |
| FR-6 | 실패 · 503 · 404 면 띠를 그리지 않는다(코인 FR-8 과 같다). 불러오는 동안 자리 고정 | **완료** — `disabled` · `unavailable` 도 그리지 않는다. 자리는 코인 띠와 같은 뼈대 |
| FR-7 | `KrIndexSummary` 큰 상자는 지운다(지수는 대표 · 작은 칸으로 들어간다) — 주인 REQ `FE-REQ-041` FR-31 Changelog | **완료** — `KrIndexStrip` · `KrIndexSummary` 와 쓰지 않게 된 `useKrIndices` 를 지웠다 |
| FR-9 | (2026-11-02 추가) **좁은 데스크톱에서도 일정이 보인다** — 1379px 이하에서 상자를 숨기던 규칙(`FE-REQ-037` FR-7) 때문에 1280 폭에서 국내 일정이 사라졌다. 항목 열을 띠 안에서 가로로 밀고 상자는 남긴다 | **완료** (`d57f10fb`) |
| FR-8 | (2026-11-02 추가) 띠 아래 **"다가오는 일정" 한 줄(`FE-REQ-046` FR-5)을 지운다** — 띠 안 상자(FR-4)와 같은 3건이라 두면 같은 숫자 두 번(`screen-desktop.md` §5). `KrScheduleStrip` · `KrScheduleLine` · `useKrSchedule` 삭제, 날짜 모양은 `formatKrScheduleDate` 로 옮김 | **완료** |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-02 | 구현 · done. FR-8(일정 줄 제거) 추가 — `FE-REQ-046` FR-5 정정과 짝. 위험 칸은 보유 전체라 국내 탭에도 둔다(BTC 동조만 뺌) |
| 2026-11-02 | `d57f10fb` fix(fe): FR-9 추가 — 1379px 이하 상자 유지 · 항목 열 가로 밀기(일정 줄 제거로 1280 폭에서 일정이 사라진 것 · 기존 페이지 넘침) |
| 2026-11-02 | FR-2 의 "환율 칸"은 없다 — 원/달러를 범위에서 뺌(`SRV-REQ-042` FR-3, 실전 키 안 씀) |
| 2026-11-02 | MONEY-F1(`FE-REQ-053`) 에서 이 REQ 가 걸렸다 — shared 레이어 → `@repo/web-shared`(import 경로 치환)(`20971abf`) · 투자 화면 `apps/web/src` → `packages/domain-invest/src`(내용 무변경) · 투자 zone 조립(`b00b0cea`) · 시세 타일 등락 — 금액만 말줄임, 변동률은 늘 보임(`a55d8ca4`). 파일 9개(경로 이동 내용 무변경 4 · 수정 5 · 추가 0 · 삭제 0). 화면 · 동작이 바뀐 몫은 위 커밋 설명대로 |
| 2026-11-05 | FE-REQ-013 FR-80 2단계 쿠키 세션(`feat/fe-req-013-fr80-cookie-session`, 루트 `requirements/specs/done/F000-cookie-session-slice.md`): 파일만 걸침 — `packages/domain-invest/src/widgets/judgment-overview/ui/JudgmentOverview.tsx`(이 REQ 가 머리 주석 주인)에서 토큰 헤더(`authHeader()`)를 뺐다 · 로그인 여부 `useHasSession`. 토큰은 httpOnly 쿠키 · 같은 origin 이라 브라우저가 싣는다(`721063fc`). 화면 · 동작 무변경 |

---
id: FE-REQ-046
feature: F008
area: frontend
kind: UI
title: "F008 슬라이스 24 — 국내 상세 주요 사건 카드 · 국내 탭 다가오는 일정 띠"
priority: high
created: 2026-10-30
source: pm/requirements/specs/in-progress/FEATURE-008-forecast-intelligence.md
---

> **2026-11-02 1단계 구현** — FR-1 · 2 · 4 · 5 · 6 · 7 · 8. FR-3(예상 창 문구)는 2단계. 디자인은 기준 화면 실측표(`FE-REQ-047` "정보 상자" ·
> 본문 13/600 · 라벨 12/500)로 맞췄다. 검증 `checklists/FE-REQ-046.md`.
> **정정 2026-11-02** — 국내 탭 일정 "띠(줄)"는 지웠다. 같은 3건이 국내 요약 띠의 오늘의 시장 상자 안에 있다(`FE-REQ-050` FR-4 · FR-8). 제목의 "일정 띠"는 그 상자를 뜻한다.

## Summary

주요 사건 카드(`FE-REQ-038` FR-13, `entities/coach/ui/EventsCard.tsx`)는 코인 상세(`widgets/symbol-analysis`)에만 있다.
국내 상세(`pages/investment-detail/ui/KrStockDetailBody.tsx`)에도 같은 카드를 붙이고, `/investments` 국내 탭에
다가오는 국내 일정 한 줄을 둔다. 진입점은 `/investments` 다 — 홈에 달지 않는다.

디자인은 착수 전에 기준 증권 앱 스타일을 실측해 맞춘다(일정 리스트 행 · D-day 칩 · 빈 상태). 문서 · 코드에 출처 이름 0건.

## FR

| FR | 내용 |
|---|---|
| FR-1 | 국내 상세에 `EventsCard` — 소유자만(404 면 카드 자체를 그리지 않는다, 코인과 같다). 위치는 국내 판단 카드 아래 |
| FR-2 | 카드 안을 **이 종목 일정**(`scope=symbol`, 2단계) → **시장 일정**(`scope=market`) 순으로(두 묶음이 다 있을 때만 묶음 제목). 지역 칩(국내 · 미국) — **국내 · 미국이 섞일 때만**, 그때 이름은 지역 말을 뺀 짧은 이름("미국 · 고용보고서", 실화면에서 "미국미국 고용보고서" 겹침을 보고 고침). 종류 이름은 ~~`shared/i18n`~~ **정정 2026-11-02: `@repo/core/coach` `EVENT_KIND_LABELS` 한 벌** — 카드(코치 엔티티)와 일정 줄(시장 엔티티)이 같이 쓴다. 엔티티끼리 import 할 수 없고 `shared` 는 도메인 문구를 두지 않는다(`shared/i18n/messages.ts` 머리) |
| FR-3 | 2단계 — 확정 IR 일정이 없고 `expectedWindow` 가 있으면 "MM.DD ~ MM.DD 사이 공시 예상 · 과거 N회 기준 · 확정 아님". 한 날짜로 그리지 않는다 |
| FR-4 | 과거 반응 상세는 지금 `ReactionDetail` 그대로(분포 · 평소 대비 · 빗나간 때). 막히면 사유 한 줄 |
| FR-5 | `/investments` 국내 탭 지수 띠 아래 "다가오는 일정" 한 줄 — 가장 가까운 3건(날짜 · 종류 · D-day). 분포 없음 → 모든 로그인 사용자. 0건이면 줄을 숨긴다(빈 줄 금지). 503 이면 숨긴다. **2026-11-02 메모**: 국내 탭 자체가 소유자에게만 보여(F011 재배포 약관 — 비소유자 실화면 탭 0) **화면상 일정 줄도 소유자만** 본다. 계약(서버 · BFF)은 공개라 탭이 열리면 그대로 보인다. 간격은 줄이 갖는다 — 숨으면 여백도 없다 **정정 2026-11-02: 줄은 지웠다 — 같은 3건이 국내 요약 띠의 오늘의 시장 상자 안으로 들어갔다(`FE-REQ-050` FR-4 · FR-8). 두면 같은 숫자 두 번** |
| FR-6 | `FEATURE-006` FR-65 의 "주요 일정은 소스가 생길 때까지 두지 않는다"를 국내 탭에 한해 닫는다 — 보일 종류 · 기간은 서버가 정한다(프론트 상수 0) |
| FR-7 | 로딩은 자리 고정 스켈레톤(가격 깜빡임 · 레이아웃 이동 없음) · reduced-motion |
| FR-8 | 테스트 — 국내 카드 렌더 · 404 숨김 · 예상 창 문구 · 띠 0건 숨김 · i18n 키 누락 0 |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-02 | 1단계 구현 · in-progress. 국내 상세 `KrEvents`(판단 카드 아래, 404 · 로그인 전 숨김, 줄 다섯 칸 스켈레톤) · 국내 탭 `KrScheduleStrip`(높이 44 고정 자리). 실화면 3000: 일정 줄 글꼴이 명조로 떨어진 것을 고침(본문 글꼴 지정) — 위 지수 타일의 같은 증상은 ~~기존 화면이라 손대지 않았다~~ 사용자 "남은것 ㄱㄱ" 뒤 같은 날 고침(`KrIndexSummary` 글꼴) |
| 2026-11-02 | 국내 탭 요약 띠(`feat/kr-market-summary`, 루트 `F011-kr-market-summary-slice.md`): FR-5 일정 줄(`KrScheduleStrip` · `KrScheduleLine` · `useKrSchedule`) 삭제 — 요약 띠 상자로 옮김. 날짜 모양은 `entities/market/lib/krScheduleDate.ts` `formatKrScheduleDate` 로 |

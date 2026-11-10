---
id: SRV-REQ-041
feature: F008
area: server
kind: API
title: "F008 슬라이스 24 — 국내 주요 사건 읽기 · 다가오는 국내 일정 목록"
priority: high
created: 2026-10-30
source: pm/requirements/specs/in-progress/FEATURE-008-forecast-intelligence.md
---

> **2026-11-02 1단계 구현** — FR-1 · 2 · 3 · 5 · 6 · 7. FR-4(예상 창)는 2단계. 검증 `checklists/SRV-REQ-041.md`.

## Summary

`GET /api/coach/events`(`SRV-REQ-037` FR-10 · `GetSymbolEvents`)는 종류를 `fomc | cpi | jobs` 로 좁혀 읽고 그 밖의 행을 버린다
(`coach/domain/policy/macroEvents.ts` `MACRO_EVENT_KINDS`). 국내 종류를 열고, 국내 종목 코드로도 읽게 한다.

**일정 자체(날짜 · 종류)는 공개 사실이고, 과거 반응 분포는 전망이다.** 그래서 둘을 가른다 — 과거 반응이 붙은 카드는
지금처럼 소유자 전용(아니면 404, `ADR-003`), 다가오는 일정 목록(날짜 · 종류 · D-day 만)은 로그인 사용자 전부.

## FR

| FR | 내용 |
|---|---|
| FR-1 | `MacroEventKind` 에 국내 4종(1단계) · `kr_earnings` · `kr_ir`(2단계) 추가. 종류 → 지역(`us` · `kr`) · 범위(`market` · `symbol`) 표는 `coach/domain/policy/macroEvents.ts` 한 곳 |
| FR-2 | `GetSymbolEvents` 가 국내 종목 코드(6자리, 전망 카드와 같은 표기)를 받는다. 국내 종목엔 국내 종류 + 미국 거시(`FC-REQ-021` FR-8 이 계산했으면)를, 코인엔 미국 거시만 |
| FR-3 | 응답 행에 `scope: "market" \| "symbol"` · `region: "us" \| "kr"`. 금액 없음 · 문장 없음(라벨은 프론트 i18n). 3종(표본 · 분포와 평소 분포 · 빗나간 때) 게이트는 지금 함수 그대로 |
| FR-4 | 2단계 — 종목에 `kr_ir` 확정 일정이 없으면 `expectedWindow: { from, to, sample }`(`v_kr_earnings_window`, 마지막 분기 종료일 + lag 최소 · 최대). `renderable=false` 면 창도 싣지 않는다(표본 < 8) |
| FR-5 | 신규 `GET /api/market/kr/schedule?days=14` — 앞으로 N일(최대 35) 국내 **시장** 일정 날짜 · 종류만. 분포 없음 → 소유자 검사 없음, `authMiddleware` 만. 국내 주식 기능이 꺼진(KIS 키 없음) 상태여도 일정은 예측 DB 에서 오므로 동작한다. 예측 DB 가 꺼져 있으면 `UNAVAILABLE`(503). **(2026-11-02 구현 메모)** `market` 컨텍스트 포트 `MarketScheduleReader` + `PrismaMarketScheduleReader`(`forecast.v_upcoming_event`, `DB-REQ-034` FR-7) — `coach` 가 `market` 뒤에 조립돼 coach API 를 부르면 순환이다. 응답 `{ days, items: [{ kind, eventAt, daysUntil }] }` — `daysUntil` 은 KST 달력 차이를 서버가 센다. 지난 일정 · 종목 사건 제외. 오류 코드 `MARKET_SCHEDULE_UNAVAILABLE` |
| FR-6 | 성능 — 두 경로 모두 뷰 1회 읽기 · 100ms(`performance-server.md` 단순 조회) |
| FR-7 | Swagger — `/api/coach/events` 응답 스키마에 FR-3 · FR-4 필드, FR-5 신규 경로 |

## 계약 영향

- BFF `BFF-REQ-043` — 새 필드 중계 · 새 경로
- 프론트 `FE-REQ-046`

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 일정 요약 문장(LLM) | 숫자는 분포뿐이라 문장이 더하는 정보가 적고, 생성형 결과물 표시 의무(AI 기본법 제31조)를 먼저 화면 규칙으로 정해야 한다 | FEATURE-008 FR-72 결정 시 |
| 일정 알림 | 알림은 1종(`signal_update`)만 — `notification/policy/kindGate` | 알림 종류 확장 결정 시 |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-02 | 1단계 구현 · in-progress. 국내 종목은 두 전망 키(`KRW-` · 맨 코드)를 다 묻고 걸린 키로 자산군을 안다 — 코인엔 미국 거시만(`REGIONS_FOR`). 종류 → 지역 · 범위 표 `EVENT_KIND_META` 한 곳. 응답 순서 = 종목 사건 → 시장 일정, 같은 범위 안은 시각 순. 실서버 p95 11ms |
| 2026-11-02 | 국내 탭 요약 띠(`feat/kr-market-summary`, 루트 `F011-kr-market-summary-slice.md`): **변경 없음**(경로) — 일정 읽기(`MarketScheduleReader` · `toKrSchedule`)를 국내 요약이 재사용, 응답 `schedule` 최대 3건 · 창 35일. 웹은 `/schedule` 대신 요약 응답을 쓴다 |
- 2026-11-10: F018 로그인 없이 시세 보기(`ADR-011` · 루트 `requirements/specs/done/F018-public-market-guest-slice.md`)가 이 REQ 의 파일을 걸침 — 이 REQ 의 FR 은 그대로, 바뀐 몫:
  - `salt-server/src/market/application/GetKrMarketSchedule.ts` — 국내 소유자 판정 걷기(`ADR-011`) — 시세 · 관심 · 거래 · 국내 판단 · 미러 · 복기 · 해설은 로그인 전체(시세는 게스트 포함), 전망 셋만 소유자
  - `salt-server/src/market/presentation/krStock.controller.ts` — 국내 소유자 판정 걷기(`ADR-011`) — 시세 · 관심 · 거래 · 국내 판단 · 미러 · 복기 · 해설은 로그인 전체(시세는 게스트 포함), 전망 셋만 소유자

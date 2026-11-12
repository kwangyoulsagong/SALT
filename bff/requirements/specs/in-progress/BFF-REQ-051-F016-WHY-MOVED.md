---
id: BFF-REQ-051
feature: F016
area: bff
kind: API
title: "오늘 왜 움직였나 뷰모델 · 시장 상태 띠 · 국내 오늘 소식 · 장중 수급"
priority: high
created: 2026-11-06
source: pm/requirements/specs/in-progress/FEATURE-016-why-moved.md
---

## Summary

`FEATURE-016` 화면 계약. 숫자 계산 0(분해 %p 는 서버 값의 표시 포맷만) · 문장은 서버(①의 설명 문장 · "소식 없음" · AI 표시 문구도 서버 코드 → 화면 i18n).

## FR

| FR | 내용 |
|---|---|
| FR-1 | `GET /api/app/market/kr/:code/why-moved` · `GET /api/app/market/crypto/:symbol/why-moved` → `{ show, split: { total, market, sector \| null, idio, method }, facts[], summary: { text, citations[], label } \| null, gate }`. 서버 원천을 `allSettled` — 분해 실패면 카드 숨김(①이 없으면 ③도 없다) · 사실 원천 하나 실패면 그 kind 만 `unavailable` |
| FR-2 | `GET /api/app/market/kr/status` — 시장 조치(서킷브레이커 · 사이드카 · 시작 · 재개 예정 · source). 국내 요약 띠에 합친다 |
| FR-3 | `GET /api/app/market/kr/:code/news` — 오늘 소식(제목 · 제공처 · 시각 · 공시/시황 구분) · 광고성 제외는 서버 |
| FR-4 | `GET /api/app/market/kr/:code/flows/intraday` — 외국인 · 기관 · 개인 · 프로그램(장중 최신 · 시각) |
| FR-5 | 기존 국내 시세 · 표 뷰모델에 상태 칩 칸(`vi` · `caution` · `managed` · `liquidation` · `shortOverheat`) · `lastTradeAt` — 소비처(웹) 같은 PR |
| FR-6 | 권한 — 국내 경로 소유자 전용(서버 판정 그대로 · BFF 캐시 0 — `performance-bff.md` §4) · 코인 로그인 사용자 |
| FR-7 | 타임아웃 — 카드 800ms(③은 스냅샷 읽기라 예산 안 · 생성 중이면 `summary: null, gate: "pending"`) |

## 진행 — 단계 A done(2026-11-06)

| FR | 상태 | 구현 |
|---|---|---|
| FR-2 시장 조치 | done(정정) | ~~`GET /api/app/market/kr/status`~~ — 경로를 따로 두지 않고 **띠가 있는 두 응답에 싣는다**: 요약 `marketActions` · 상세 `marketActions`(그 종목 시장). 요청 하나가 줄고 쓰지 않는 경로를 두지 않는다. `toKrMarketActionsVM` — 옛 서버 빈 배열 · 모르는 kind 버림 · 모양이 틀린 행 계약 오류 |
| FR-5 상태 칩 칸 | done | `KR_STATUS_BADGES` 넷 더함 · `vi` · `lastTradeAt`(옛 서버 null). 숫자 계산 0 |
| 그 밖 | ~~단계 B~D~~ 단계 C · D | FR-1 · ~~3 · 4~~ · 7 · FR-6 은 기존 소유자 판정 그대로 |

루트 `requirements/specs/done/F016-A-market-status-tags-slice.md`

## 진행 — 단계 B done(2026-11-06)

| FR | 상태 | 구현 |
|---|---|---|
| FR-3 오늘 소식 | done | `GET /api/app/market/kr/:code/news` → `{ status, code, date, collectedAt, items: [{ id, kind, provider, title, publishedAt }] }`. 모르는 `kind` 는 버린다 · 링크 칸 없음 |
| FR-4 장중 수급 | done(정정) | `GET /api/app/market/kr/:code/flows/intraday` → `{ status, code, date, program: { at, netQuantity, netValue, buyValue, sellValue, collectedAt } \| null }`. ~~외국인 · 기관 · 개인~~ — 서버 원천 거부(모의 키)라 칸 없음 |
| FR-6 권한 | done | 서버 판정 그대로 · 캐시 0 · 코드 형식 400(서비스 안 부름) · 5xx · 계약 깨짐 = `unavailable` |

- 루트 `requirements/specs/done/F016-B-kr-news-flows-slice.md`

## 진행 — 단계 C done(2026-11-09)

| FR | 상태 | 구현 |
|---|---|---|
| FR-1 why-moved | done(부분) | `GET /api/app/market/kr/:code/why-moved` · `GET /api/app/market/:symbol/why-moved` → `{ date, show, reasons[], usualRate, split: { total, market, sector, idio, method, marketIndex, sectorIndex, sectorName } \| null, facts[], unavailable[] }`. **`summary` · `gate` 칸은 단계 D 가 칸과 같이**(쓰지 않는 칸을 두지 않는다). 모르는 kind · 이유는 버리고 모르는 `method` 는 계약 깨짐 |
| FR-7 예산 | done | 800ms · 5xx 한 번 다시 · 4xx 그대로 |
| 표 행 칸 | done | 국내 표 뷰모델 `moveCard`(옛 서버 `false`) · 코인 시장 개요는 서버 응답 통과 |

- 산술 0 — 테스트가 뷰모델 파일을 grep(문자열 · 주석 빼고)
- 루트 `requirements/specs/done/F016-C-move-split-facts-slice.md`

## Acceptance Criteria

- [x] 원천 하나 강제 실패 → 그 kind 만 `unavailable`(테스트 — 서버 판정을 BFF 가 그대로, 2026-11-09)
- [x] BFF 숫자 계산 0(포맷만 — grep · 테스트, 2026-11-09 `why-moved.test.ts`)
- [ ] 비소유자 국내 경로 404/403 그대로(서버 값)

## 계약 영향

- 서버 `SRV-REQ-051` · `052` · 프론트 `FE-REQ-063` · 기존 `BFF-REQ-040`(국내 뷰모델)

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-12 | F017 단계 6(측정 태그 · `SRV-REQ-053` FR-6)이 이 REQ 자리에 더함 — 왜 움직였나 사실 뷰모델에 `tag`(소식만) — 사실 판정 · 모르는 kind 버리기는 그대로 |
| 2026-11-06 | 신규(to-do) |
| 2026-11-06 | 단계 B done — FR-3 · FR-4(정정: 프로그램만) |
| 2026-11-06 | in-progress — 단계 A(FR-2 · 5) done. FR-2 를 별도 경로 대신 요약 · 상세 응답 칸으로 정정 |
| 2026-11-09 | 단계 C — FR-1(①② · summary 는 D) · FR-7 · 표 행 `moveCard` |
| 2026-11-09 | FR-3 — 오늘 소식 `related` 칸(칸 셋 · 옛 서버 빈 배열, `FE-REQ-065`) |
- 2026-11-10: F018 로그인 없이 시세 보기(`ADR-011` · 루트 `requirements/specs/done/F018-public-market-guest-slice.md`)가 이 REQ 의 파일을 걸침 — 이 REQ 의 FR 은 그대로, 바뀐 몫:
  - `bff/src/services/app-kr-stock.service.ts` — "국내 소유자 전용" 주석 · Swagger 문구 정정(판정은 서버 — 이제 사람 · 게스트 누구나)

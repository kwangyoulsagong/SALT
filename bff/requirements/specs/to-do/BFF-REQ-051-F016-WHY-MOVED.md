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

## Acceptance Criteria

- [ ] 원천 하나 강제 실패 → 그 kind 만 `unavailable`(테스트)
- [ ] BFF 숫자 계산 0(포맷만 — grep · 테스트)
- [ ] 비소유자 국내 경로 404/403 그대로(서버 값)

## 계약 영향

- 서버 `SRV-REQ-051` · `052` · 프론트 `FE-REQ-063` · 기존 `BFF-REQ-040`(국내 뷰모델)

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-06 | 신규(to-do) |

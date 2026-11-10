---
id: BFF-REQ-052
feature: F017
area: bff
kind: API
title: "AI 코치 — 판단 뷰모델 관측 · 보류 사실 · 504 측정 · 해설 스냅샷 · 물어보기 SSE"
priority: high
created: 2026-11-09
source: pm/requirements/specs/in-progress/FEATURE-017-ai-coach-best-case.md
---

## Summary

`FEATURE-017` 화면 계약. 숫자 계산 0 · 문장 0(사유 코드 · 사실 칸만 — 문장은 화면 i18n).

## FR

| FR | 내용 | 단계 |
|---|---|---|
| FR-1 | `GET /api/app/ai-coach/detail` 모드 뷰모델에 `observations[]`(항목 · 값 · 문턱 · 거리 · 기여 · 결측) · 보류면 `blockedReason` + `blockedFacts` — 모르는 항목 · 사유는 버림, 모양이 틀리면 계약 오류(그 모드만 `unavailable`) | 1 |
| FR-2 | **504 측정** — 이 경로 구간 시간(서버 호출별)을 로그 · 국내 · 코인 p95. 예산 400ms(`performance-bff.md` §1 코치 상세) 넘으면 원인 블록 표시. 직렬 호출이 있으면 `allSettled` 병렬 | 1 |
| FR-3 | 해설 스냅샷 — `GET /api/app/ai-coach/explanation?symbol&mode` → `{ status: ready|pending|off, sentences[{ text, citations[] }], provider, label }`. 생성 중이면 `pending`(화면 "정리하는 중") · 캐시 0 | 2 |
| FR-4 | 물어보기 — `POST /api/app/ai-coach/ask` SSE 중계(`streaming-sse.md` 이벤트 계약 · 취소 전파 · 하트비트) | 3 |

## Acceptance Criteria

- [ ] 원 응답 → 뷰모델 계약 테스트(관측 · 보류 사실 · 모르는 값 버림 · 계약 깨짐)
- [ ] `ai-coach/detail` p95 ≤ 400ms(국내 · 코인 측정표)
- [ ] BFF 숫자 계산 0(grep 테스트)

## 계약 영향

- 서버 `SRV-REQ-053` · FE `FE-REQ-064` · 기존 `BFF-REQ-023`(코치 경로) · `BFF-REQ-039`

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-09 | 신규(to-do) |

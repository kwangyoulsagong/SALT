---
id: BFF-REQ-052
feature: F017
area: bff
kind: API
title: "AI 코치 — 결함(504 → 마지막 판단 · 호가 pending · 소식 scope) · 판단 관측 · 보류 · 해설 4단 · 시나리오 · 점검 · 측정 태그 뷰모델"
priority: high
created: 2026-11-09
source: pm/requirements/specs/in-progress/FEATURE-017-ai-coach-best-case.md
---

## Summary

`FEATURE-017` 화면 계약. 숫자 계산 0 · 문장 0(사유 코드 · 사실 칸만 — 문장은 화면 i18n). 모르는 값 · 사유 · 단은 버린다.

> **2026-11-10 개정 — 범위 "잘 사고 잘 팔기"**. 11-09 FR-4(물어보기 SSE)는 뺐다. FR-0(결함) · FR-3~5 새로. 번호 다시 매김.

## FR

| FR | 내용 | 단계 | 상태 |
|---|---|---|---|
| FR-0 | **결함(2026-11-10)** ① `ai-coach/detail` 서버 판단이 시간을 넘기면 같은 **토큰 해시** · 종목 · 모드의 마지막 판단(10분 안)을 `staleSince` 와 함께(`8baf8109` — 로그 시간 초과 157줄, 검증 안 한 사용자 id 키는 위조 토큰이 남의 판단을 읽어 금지) ② 국내 호가 뷰모델 `pending`(`001aac19`) ③ 국내 소식 뷰모델 `scope: today|recent`(`f73bbc9f`) | 0 | **done** |
| FR-1 | `GET /api/app/ai-coach/detail` 모드 뷰모델에 `observations[]` · 보류면 `blockedReason` + `blockedFacts`. 모양이 틀리면 그 모드만 `unavailable` | 1 | to-do |
| FR-2 | `GET /api/app/ai-coach/explanation?symbol&mode` → `{ tier: latest|previous|template|none, sentences[{ text, citations[{ id, label, at }] }], generatedAt, aiGenerated }` — 서버 4단 그대로 · 캐시 0 | 1 | to-do |
| FR-3 | `GET /api/app/ai-coach/check?symbol&side=buy|sell` — 서버 점검 그대로(조건 · 표본 · 분포 · 무효선 거리 · 보유 연장 분포). `no_condition` · 보유 없음(`side=sell`) 상태 | 2 | to-do |
| FR-4 | `GET /api/app/ai-coach/scenario?symbol` — 1h · 4h · 1d `{ renderable, blockedReason, pUp, q10, q50, q90, invalidation, track }`. 비소유자 404 통과(자리 0) | 3 | to-do |
| FR-5 | 국내 · 코인 소식 뷰모델 행에 `eventKind` · `reaction` · `preMove5d` · `label` — 모르는 `label` 은 태그 없이 행만 | 4 | to-do |

## Acceptance Criteria

- [x] FR-0 — 마지막 판단 테스트 3(새 판단 null · 실패면 마지막 + 시각 · 다른 토큰/종목/모드 504 · 10분 넘으면 504) · 키 스냅샷 `staleSince` · 전체 444 통과
- [ ] 원 응답 → 뷰모델 계약 테스트(관측 · 보류 · 4단 · 점검 · 시나리오 · 태그 · 모르는 값 버림)
- [ ] `ai-coach/*` p95 ≤ 400ms(국내 · 코인 측정표) · BFF 숫자 계산 0(grep 테스트)

## 계약 영향

- 서버 `SRV-REQ-053` · FE `FE-REQ-064` · 기존 `BFF-REQ-023`(코치 경로) · `BFF-REQ-039` · `BFF-REQ-040`(국내 호가) · `BFF-REQ-051`(국내 소식)

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-09 | 신규(to-do) |
| 2026-11-10 | to-do → in-progress. **개정** — FR-0 결함 셋 done(`8baf8109` · `001aac19` · `f73bbc9f`) · FR-2 해설 4단 · FR-3 점검 · FR-4 시나리오 · FR-5 태그. 물어보기 뺌 |

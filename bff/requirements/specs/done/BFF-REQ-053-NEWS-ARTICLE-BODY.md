---
id: BFF-REQ-053
feature: F016
area: bff
kind: API
title: "기사 본문 경로 — 코인 · 국내 한 뷰모델"
priority: medium
created: 2026-11-09
source: salt-server/requirements/specs/done/SRV-REQ-054-NEWS-ARTICLE-BODY.md
---

## Summary

`GET /api/app/news/:id/body`(로그인 · uuid 아니면 400) · `GET /api/app/market/kr/:code/news/:serial/body`(소유자 · 형식 아니면 400) →
`{ status: "ok", paragraphs, originalUrl } | { status: "not_found" } | { status: "unavailable" }`. 숫자 계산 0 · 문단 그대로.

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | 경로 둘 · 같은 서비스 함수(`app-article-body.service`) · 뷰모델 `toArticleBodyVM` | done |
| FR-2 | 예산 ~~15초~~ **20초**(첫 조회 = 서버 검색 4s, 못 찾으면 한 번 더 4s + 페이지 8s = 최악 16s — 확인 2회차) · 캐시 0(서버가 캐시) · 다시 시도 0(서버가 실패를 캐시) | done |
| FR-3 | 4xx 그대로 · 503(키 없음 · 국내 꺼짐) · 5xx · 시간 초과 · 계약 깨짐 = `unavailable` · 서버 `failed` = `unavailable` · 빈 문단 = `not_found` · **원문 주소 http(s) 아니면 `null`**(확인 2회차) | done |

## Acceptance Criteria

- [x] 뷰모델 · 경로 · 실패 격리 테스트(`services/__tests__/article-body.test.ts`)
- [x] 실서버 — 코인 · 국내 ok 문단 · 비로그인 401 · 형식 400 · 없는 기사 404

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-09 | 신규 · done |
| 2026-11-09 | 확인 2회차 — 예산 15 → 20초(서버 두 번째 검색 뒤 첫 조회가 잘림 — 결함) · 원문 주소 http(s) 만 |

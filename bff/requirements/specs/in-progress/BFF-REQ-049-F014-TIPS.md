---
id: BFF-REQ-049
feature: F014
area: bff
kind: API
title: "금융 팁 — 공개 /api/app/tips(인증 없음 · 캐시) · 때맞춘 팁 for-me"
priority: medium
created: 2026-10-30
source: salt-server/requirements/specs/to-do/SRV-REQ-047-F014-CONTENT.md
---

## FR

| FR | 내용 |
|---|---|
| FR-1 | `GET /api/app/tips` · `/api/app/tips/:slug` — 인증 없음. 개인 데이터 0. `Cache-Control` + ISR 재검증 태그 |
| FR-2 | `needs_check` 글은 `noindex` 메타 플래그를 응답에 |
| FR-3 | `GET /api/app/tips/for-me?context=` — 로그인 필요, 0~1건, 닫기 `POST .../:id/dismiss` |
| FR-4 | 개인화 실패 시 일반 예시로 폴백 |
| FR-5 | 공개 경로 레이트 리밋(검색 유입 대비) |

## Acceptance Criteria

- [ ] 공개 응답에 사용자 식별 정보 0
- [ ] 비로그인 for-me → 401, 공개 글은 200

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |

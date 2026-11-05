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

- [x] 공개 응답에 사용자 식별 정보 0 — 서비스 테스트(서버가 끼운 `userId` 를 버림) · 실스택 응답 grep
- [x] 비로그인 for-me → 401, 공개 글은 200 — 실스택(4001)

## 구현 현황 — 금융 팁 S2a(2026-11-05)

| FR | 상태 | 어디 |
|---|---|---|
| FR-1 공개 목록 · 글 | **done** — 인증 없음 · 서버 필드만(모르는 필드 버림) · `Cache-Control: public, max-age=60, stale-while-revalidate=600`. ISR 은 웹 zone(60초) | `app-tips.service.ts` · `tips.controller.ts` |
| FR-2 `noindex` | **done** — 서버 값 그대로(확인 필요 글) | 같은 파일 |
| FR-3 for-me · 닫기 | **done** — `GET /api/app/tips/for-me?context=`(세 값 밖이면 서버 앞에서 400 `INVALID_TIP_CONTEXT`) · `POST /api/app/tips/:slug/dismiss` · `no-store` | 같은 파일 · `tips.routes.ts` |
| FR-4 실패 폴백 | **done** — 1.5초 예산 · 시간 초과 · 5xx 면 `tip: null` + `degraded`(카드 없음 = 일반 화면), 401 은 그대로 | `TIP_FOR_ME_BUDGET_MS` |
| FR-5 레이트 리밋 | **done** — 공개 두 경로 IP 분당 120 | `PUBLIC_TIPS_RATE_LIMIT` |
| 라우팅 표 | `/content` → platform | `config/server-routes.json` |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-05 | 금융 팁 S2a — to-do → in-progress. FR-1~5 done · 라우팅 표 `/content` → platform. 커밋 `36d1f7b9` |

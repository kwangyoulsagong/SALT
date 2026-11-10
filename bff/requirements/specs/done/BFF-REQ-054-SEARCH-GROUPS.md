---
id: BFF-REQ-054
feature: F000
area: bff
kind: API
title: "검색 모달 2단계 화면 계약 — 결과 묶음 · 지금 뜨는 업종 · 곁 칸"
priority: medium
created: 2026-11-10
source: "`FE-REQ-066` FR-8 · 서버 `SRV-REQ-055`"
---

## Summary

> **done 2026-11-10** — `1110aa9b`. 검증 `reports/checklists/BFF-REQ-054.md`

서버 `SRV-REQ-055` 세 경로를 화면 계약으로 옮긴다. 순위 · 줄 수 · 창(일주일 · 30일)은 서버가 정했다 — **BFF 는 다시 자르거나 정렬하지 않는다.**

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | `GET /api/app/search/groups?q=` → `{ sectors, indices, news }` · `GET /api/app/search/rising-sectors?limit=` → `{ asOf, items }` · `GET /api/app/search/related?assetType=&symbol=` 또는 `?sector=` → `{ basis, sector, items }`. 인증 필수 | done |
| FR-2 | 뷰모델 순수 함수(`search-extras.viewmodel.ts`) — 형식이 틀린 줄은 버린다 · 모르는 값 `null`(0 · 빈 문자열 0) · **원문 · 이미지 주소는 http(s) 만**(화면이 `href` 로 그린다) · 곁 칸 줄이 없으면 `basis: none` | done |
| FR-3 | 예산 400ms(검색과 같다 — 서버 실측 10ms) · 재시도 1회(GET) · 화면을 떠나면 upstream 끊음 · **캐시 0**(국내 칸이 소유자 판정 — 공유 캐시는 비소유자에게 샌다) · 검색어 로그 가림(`loggableUrl`) | done |
| FR-4 | 입력 경계를 서버 DTO 와 같게 — `q` ≤ 30 · `limit` 1~20 · 곁 칸은 종목 또는 업종 하나(400 을 서버 전에) | done |

## Acceptance Criteria

- [x] 뷰모델 테스트 — 틀린 줄 버림 · `javascript:` 원문 `null` · 빈 응답 · 곁 칸 `none`(`services/__tests__/search-extras.viewmodel.test.ts`)
- [x] `npm run build` · `npm test` 434
- [x] 실호출 4011 — 세 경로 200 · 둘 다 준 곁 칸 400 · 토큰 없음 401 · 로그 `q=*`

## 계약 영향

- 프론트 `FE-REQ-066` FR-8 이 소비(`entities/market` `useSearchGroups` · `useRisingSectors` · `useSearchRelated`). 기존 `/api/app/search` 무변경

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-10 | 신규 · done — FR-1~4 `1110aa9b` |

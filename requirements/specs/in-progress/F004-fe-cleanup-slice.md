---
id: SLICE-F004-FE-CLEANUP
title: "F004 슬라이스 8 — 프론트 부채 정리 (axios 제거 · 봉 병합 이관)"
priority: medium
labels: [F004, slice, fe, tech-debt, bundle, test]
created: 2026-09-22
---

## Summary

회고 Action 으로 여러 번 적고 닫지 못한 프론트 부채 둘을 닫는다 — **axios 직접 호출 제거 + lint 금지**(F000 회고 3건),
**봉 시각 · 실시간 병합을 `@repo/core/market` 으로 옮기고 단위 테스트 러너**(슬라이스 7 회고). 화면 동작은 그대로다.
영역 하나(프론트)라 본문은 영역 REQ 에 있다 — 이 문서는 전 영역 지도에서 찾을 수 있게 남기는 색인이다.

## 범위

| REQ | FR | 내용 |
|---|---|---|
| `FE-REQ-035` | 전부 | `marketApi` · `toggleWatchlistApi` → `apiFetch`, `axios` lint 금지 · 의존성 제거, `@repo/core/market` + vitest, 규칙 6곳 |

## 판단 — 리뷰가 볼 곳

1. **예외 없는 금지** — 사용처를 0으로 만든 뒤 막았다. 허용 슬라이스 목록을 두지 않는다
2. **병합의 자리를 `@repo/core` 로** — 플랫폼 무관 순수 함수이고 RN 도 같은 병합이 필요하다. 러너도 거기 붙였다
3. **공통 HTTP 클라이언트는 아직 만들지 않았다** — 슬라이스별 `*ApiError` 셋이 같은 모양이지만, 넷째에서 올린다

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| BFF · 서버 규칙 문서 정리(다음 후보 ①의 나머지) | 영역이 다르다 | 별도 PR |
| RN 이 `@repo/core/market` 사용 | RN 시세에 실시간 봉이 없다 | RN 시세 실시간 REQ |

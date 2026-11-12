---
id: FE-REQ-068
feature: F016
area: frontend
kind: UI
title: "뉴스 모달 기사 본문 — 받는 동안 줄 자리 · 못 찾으면 예전 그대로"
priority: medium
created: 2026-11-09
source: 사용자 2026-11-09 "상세 모달에 뉴스 기사 렌더링 해야지" · "국내도 똑같에"
---

## Summary

`FE-REQ-065` 모달에 본문 칸. 열린 기사 하나만 부른다(`useArticleBody` — staleTime 무한, 본문은 바뀌지 않는다). 문단은 `<p>` 로만 그린다(HTML 해석 0).

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | `NewsArticleView.bodyRef` — 코인 `{ kind: "coin", id }` · 국내 시황 `{ kind: "kr", code, serial }` · 공시 `null` | done |
| FR-2 | 받는 동안 줄 자리 5줄(`aria-busy`, **실제로 받는 중일 때만** — 꺼진 쿼리는 v5 `isPending` 이 참이라 `isLoading`) · 찾으면 문단(14/24 · 문단 사이 12) + "출처 {제공처}" · 원문 단추(새 탭) · **로그인일 때만 부른다**(비로그인 요청 0 — 확인 2회차) | done |
| FR-3 | 못 찾음 · 실패 — 코인 요약 + 원문 · 국내 "이 소식은 본문을 찾지 못했어요. 본문은 제공처에서 볼 수 있어요." | done |
| FR-4 | 국내 목록 안내 문구 정정 — ~~제목만 모아요 · 원문은 제공처에서~~ "누르면 찾은 기사 본문을 함께 보여 줘요" | done |

## Acceptance Criteria

- [x] 실화면 국내 상세(005930 · 005490) 8건 중 7건 본문 · 자동 시황 1건 안내 · 코인 프리뷰 본문 · axe 0 · 넘침 0 · 스크립트 0
- [x] 로딩(2.5s 지연) 줄 자리 → 본문 · 실패(unavailable · 500) → 안내

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-12 | F017 단계 6(측정 태그 · `SRV-REQ-053` FR-6)이 이 REQ 자리에 더함 — 뉴스 모달에 "같은 종류 과거 반응" 칸 — **본문 위**(본문이 길면 아래 칸은 안 보인다, 실화면). 본문 찾기 · 원문 링크는 그대로 |
| 2026-11-09 | 신규 · done |
| 2026-11-09 | 확인 2회차 — 로그인일 때만 부름(비로그인 401 요청 0) · 줄 자리는 받는 중일 때만 · 코인 미리보기 주석 정정 |
| 2026-11-10 | 코인 프리뷰가 모달을 직접 그리지 않는다 — 본문 칸은 그대로 `NewsModal` 이 받는다(그리는 자리만 시세 보드 `NewsModalHost`, `FE-REQ-065` `87eb8083`) |
- 2026-11-10: F018 로그인 없이 시세 보기(`ADR-011` · 루트 `requirements/specs/done/F018-public-market-guest-slice.md`)가 이 REQ 의 파일을 걸침 — 이 REQ 의 FR 은 그대로, 바뀐 몫:
  - `bff/src/services/app-article-body.service.ts` — "국내 소유자 전용" 주석 · Swagger 문구 정정(판정은 서버 — 이제 사람 · 게스트 누구나)
  - `salt-microFe/packages/domain-invest/src/entities/market/api/useArticleBody.ts` — 시장 조회의 로그인 조건 제거(게스트 토큰으로 이어 봄)

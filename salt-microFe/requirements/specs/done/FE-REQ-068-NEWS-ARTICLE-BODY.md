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
| FR-2 | 받는 동안 줄 자리 5줄(`aria-busy`) · 찾으면 문단(14/24 · 문단 사이 12) + "출처 {제공처}" · 원문 단추(새 탭) | done |
| FR-3 | 못 찾음 · 실패 — 코인 요약 + 원문 · 국내 "이 소식은 본문을 찾지 못했어요. 본문은 제공처에서 볼 수 있어요." | done |
| FR-4 | 국내 목록 안내 문구 정정 — ~~제목만 모아요 · 원문은 제공처에서~~ "누르면 찾은 기사 본문을 함께 보여 줘요" | done |

## Acceptance Criteria

- [x] 실화면 국내 상세(005930 · 005490) 8건 중 7건 본문 · 자동 시황 1건 안내 · 코인 프리뷰 본문 · axe 0 · 넘침 0 · 스크립트 0
- [x] 로딩(2.5s 지연) 줄 자리 → 본문 · 실패(unavailable · 500) → 안내

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-09 | 신규 · done |

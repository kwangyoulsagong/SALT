---
id: FE-REQ-058
feature: F014
area: frontend
kind: UI
title: "F5 — 금융 팁 zone(apps/web-tips + domain-tips): 공개 · ISR · 휴대폰 폭 · 때맞춘 팁 카드"
priority: medium
created: 2026-10-30
source: pm/requirements/specs/in-progress/FEATURE-014-money-tips.md
---

## Summary

유일한 공개 zone. 검색으로 들어오므로 **휴대폰 폭 레이아웃이 필수**다 — 768 미만 안내(`FE-REQ-043`)에서 뺀다. **법무 확인 전 robots 차단 · 공개 플래그 꺼짐**.

## FR

| FR | 내용 | FEATURE-014 |
|---|---|---|
| FR-1 | `/tips` 목록 · `/tips/[slug]` — 서버 컴포넌트 · ISR. 메타(출처 · 작성일 · 검수일 · 기준 연도 · 유효기한) 항상 표시 | FR-1 |
| FR-2 | `needs_check` 글 — "확인 필요" 띠 · `noindex` | FR-2 |
| FR-3 | 로그인 시 "내 숫자로 다시 읽기" 블록(서버 렌더, 실패 시 일반 예시) | FR-6 |
| FR-4 | 제도 변경 diff 뷰 | FR-7 |
| FR-5 | 30초 맞히기 · 맞힌 카드 모음 | FR-8 |
| FR-6 | `@repo/ui` 때맞춘 팁 카드 — 각 도메인 zone 이 쓰는 공용 컴포넌트(닫기 · 공식 링크) | FR-4 |
| FR-7 | 휴대폰 폭 레이아웃 · LCP 2.5s(모바일 측정) · 768 미만 안내 제외 목록에 `web-tips` | NFR |
| FR-8 | 원문 위치 결정(MDX vs DB) 뒤 렌더 소스 — 1안 MDX | Open Question |

## Acceptance Criteria

- [ ] 메타 하나 없는 글이 빌드에서 실패
- [ ] 360px 폭 레이아웃 깨짐 0 · LCP 측정 기록
- [ ] 공개 페이지에 사용자 데이터 0
- [ ] 법무 확인 전 robots `noindex` 전역

## 계약 영향

- BFF `BFF-REQ-049`

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |

---
id: FE-REQ-056
feature: F012
area: frontend
kind: UI
title: "F3 — 저축 zone(apps/web-savings + domain-savings): 목표 · 계산기 · 도달 구간 · 저울 · 모이는 장면"
priority: high
created: 2026-10-30
source: pm/requirements/specs/in-progress/FEATURE-012-savings-goals.md
---

## Summary

지금 `entities/goal` · `features/add-goal` 을 `packages/domain-savings` 로 옮기고 목표를 계산기 화면으로 만든다. 바탕은 **모으는 재미** — 장면과 숫자가 말하고 앱은 칭찬하지 않는다.

## FR

| FR | 내용 | FEATURE-012 |
|---|---|---|
| FR-1 | 이전 — `entities/goal` · `features/add-goal` → `domain-savings`. 라우트 `/goals` · `/goals/[id]` · `/goals/new` 는 `apps/web-savings` | — |
| FR-2 | 만들기 — 템플릿 7종 · 기준선(출처 · 연도 · `verified:false` 면 "미확인") · 금액 수정 · 첫 도장 미리보기 | FR-1 · 17 |
| FR-3 | 계산기 — 금액+기한 ↔ 금액+월 적립 토글. 결과는 서버 응답, 입력 중 디바운스 요청 | FR-2 |
| FR-4 | 적립 — 단건 · 나눠 넣기. 저장 후 장면 한 칸 이동 모션 | FR-3 · 15 |
| FR-5 | 도달 구간 팬 차트 + 적중 이력(또는 "기록 부족" 이유). 한 점 날짜 표시 금지(`plan_only` 는 "계획대로면 X월" 문장) | FR-4 · 5 |
| FR-6 | 저울 — 목표별 월 적립 슬라이더 → 구간 변화, [확정]만 저장 | FR-6 |
| FR-7 | 이정표 · 프레임 전환 · 오늘 돈 · 놓친 달 회고 · 비상시 비교 카드 | FR-7~11 |
| FR-8 | 모이는 장면 — 템플릿별 그림(여행 비행기 · 차 조립 · 우산). `FE-REQ-044` 모션 장면 재사용. reduced-motion 이면 정지, 진척은 텍스트로도 | FR-15 |
| FR-9 | 실물 환산 한 줄 · 사용자 단위 만들기 | FR-16 |
| FR-10 | 도장판 · 엽서 보관함(달성 목표) | FR-17 · 18 |
| FR-11 | 공동 목표 — 비율 차이 · 이모지 반응 | FR-13 · 19 |
| FR-12 | 때맞춘 팁 카드 자리(`@repo/ui` 공용 카드, `for-me?context=savings`) | F014 FR-4 |
| FR-13 | 첫 숫자 서버 렌더(RSC) — 스켈레톤 없이 진척 · 이정표 | NFR |

## Acceptance Criteria

- [ ] `domain-savings` 에 금액 · 날짜 계산 0(리뷰 · grep: 산술 유틸 import 0)
- [ ] 칭찬 · 재촉 · 명령형 문구 0(금지어 검사)
- [ ] reduced-motion 모션 0 · 스크린리더로 진척 읽힘
- [ ] 기존 목표 화면 기능 회귀 0

## 계약 영향

- BFF `BFF-REQ-047`

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |

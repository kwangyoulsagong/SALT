---
id: FE-REQ-057
feature: F013
area: frontend
kind: UI
title: "F4 — 가계부 zone(apps/web-household + domain-household): 3초 입력 · 붙여넣기 · 봉투 · 착지 · 목표 시계"
priority: high
created: 2026-10-30
source: pm/requirements/specs/in-progress/FEATURE-013-household-budget.md
---

## Summary

신규 zone. 웹은 붙여넣기 · 월 화면 · 예산 편집이 강하고, 빠른 입력의 주 무대는 RN(`RN-REQ-034`)이다.

## FR

| FR | 내용 | FEATURE-013 |
|---|---|---|
| FR-1 | `/household` — 이번 달 · 봉투 · 착지 구간 · 최근 지출 | FR-6 · 7 |
| FR-2 | `/household/new` — 금액 먼저(숫자 입력 포커스) · 최근 항목 칩 · 분류 제안 확인. 3탭 이내 | FR-1 · 2 |
| FR-3 | 붙여넣기 — 여러 문자 → 후보 목록(체크 · 수정) → 한 번에 저장. 원문은 컴포넌트 상태에서만, 저장 뒤 비움 · 로컬 저장 0 | FR-3 |
| FR-4 | 반복 템플릿 확인 카드 · 대략 합계 입력("대략" 라벨) | FR-4 · 5 |
| FR-5 | 저장 후 목표 시계 한 줄("결혼 목표 3일 늦어짐", `pending` 이면 "계산 중") | FR-8 |
| FR-6 | 예산 방식 고르기 · 봉투 편집. 초과는 회색 음수 — 빨강 · 경고 아이콘 · 팝업 0 | FR-6 |
| FR-7 | `/household/month/[ym]` — 착지 구간 + 지난달 적중 · 월 마감 리뷰 3문항 · 할부 띠 · 공제 계기판("추정" · 기준 연도) | FR-7 · 9 · 10 · 11 |
| FR-8 | 감정 태그 · 만족도 거울 · 사람 장부 · 노동시간 환산(끄고 켬) | FR-13~15 |
| FR-9 | 재미 — 챌린지(내가 고름 · 언제든 종료 · 실패 표시 0) · 달력 스티커(연속 일수 0) · 이야기 카드(공유 시 금액 가림 기본) | FR-16 · 19~21 |
| FR-10 | 저장 실패 시 입력값 보존 | UX |

## Acceptance Criteria

- [ ] 한 건 입력 3탭 이내(실측 기록)
- [ ] 예산 초과 화면에 경고 색 · 팝업 0
- [ ] 붙여넣기 원문이 localStorage · 로그 · 에러 리포트 0
- [ ] 연속 일수 표시 0 · 챌린지 실패 표시 0

## 계약 영향

- BFF `BFF-REQ-048`

## 구현 현황 — F4a (2026-11-04, `requirements/specs/in-progress/MONEY-S1-household-entry-slice.md`)

`packages/domain-household`(entities `household` · features `record-expense` · `edit-budget` · pages `household` · `new-expense` · `budget`) · `apps/web-household` 는 re-export 만.

| FR | 상태 | 비고 |
|---|---|---|
| FR-1 | done — `/household` 이번 달(쓴 돈 · 정확/대략 · 남은 돈 · 하루 가용 · 착지 · 봉투 · 쓴 내역 · 지우기) | 첫 숫자 서버 렌더(쿠키 — `FE-REQ-013` FR-80 1단계) |
| FR-2 | done — 금액 먼저(자동 포커스 · `inputMode numeric`) · 최근 쓴 곳 칩(가맹점 + 분류) · 분류 칩 12 · 한 줄 입력(서버 읽기 → 확인) | 3탭 실측: 금액 → 칩 → 저장 |
| FR-3 | done — 붙여넣기 → 후보(체크 · 분류 고치기) → 한 번에 저장. 원문은 상태에만 · 읽기 누르면 즉시 비움 · 파싱 결과 캐시 0(`gcTime 0`) | 실측: 저장소에 원문 조각 0 |
| FR-4 | 대략 합계 done("대략" 표지) — 반복 템플릿 확인 카드는 S1b | |
| FR-5 | done — "결혼 목표가 N일 늦어져요" / "하루도 안 늦어져요" / `pending` 이면 "계산 중" 뒤 한 번 다시 묻는다 | |
| FR-6 | done — 50/30/20(소득만 보냄) · 봉투. 넘친 봉투는 같은 색 · −글자만 | |
| FR-7 | 착지 + 지난달 적중 done · 지난 달 `/household/month/[ym]` — 리뷰 3문항 · 할부 띠 · 공제는 S1b | |
| FR-10 | done — 실패 시 입력값 그대로 · 문구 "저장 못 했어요" | |
| FR-8 · 9 | S1b | |

탭 `APP_TABS` 가계부 `readyBy: null`(`FE-REQ-054`). 번들(Next 표, First Load JS): `/household` ~~148~~ 149(리뷰 반영 뒤) · `/household/new` 131 · `/household/budget` 127 kB · 공용 102 kB.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-03 | MONEY-F2(`FE-REQ-054`) — 이 REQ 에 걸린 몫(`FE-REQ-054`) — 가계부 탭은 `APP_TABS` `readyBy: "FE-REQ-057"`(비활성). 첫 화면이 생기면 `readyBy: null` · zone 레이아웃에 `AppShell` + `VIEW_TRANSITION_CSS` · 설정을 vanilla-extract 로 |
| 2026-11-04 | F4a — in-progress(`df45ae7d`). FR-1~3 · 5 · 6 · 10 done · 4 · 7 일부. 수용 기준 4/4 |
| 2026-11-04 | 리뷰 반영 `bfb337b7` — 목표 시계 다시 묻기 실패 시 "계산 중" 멈춤 → 줄 지움(Playwright route 로 성공 · 실패 둘 다 실측) · 엔티티 슬라이스 `expense` → `household`(서버 컨텍스트와 같은 이름) · 번들 `/household` 149 kB |

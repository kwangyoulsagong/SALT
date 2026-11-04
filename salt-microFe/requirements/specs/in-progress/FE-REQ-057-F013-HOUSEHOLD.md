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

- [x] 한 건 입력 3탭 이내(실측 기록)
- [x] 예산 초과 화면에 경고 색 · 팝업 0
- [x] 붙여넣기 원문이 localStorage · 로그 · 에러 리포트 0
- [x] 연속 일수 표시 0 · 챌린지 실패 표시 0(두 화면은 S1b — 지금 화면에 해당 표시 0)

## 계약 영향

- BFF `BFF-REQ-048`

## 구현 현황 — F4a (2026-11-04, `requirements/specs/done/MONEY-S1-household-entry-slice.md`)

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

## 구현 현황 — F4b (2026-11-04, `requirements/specs/done/MONEY-S1b-household-month-slice.md`)

| FR | 상태 | 비고 |
|---|---|---|
| FR-4 | 반복 템플릿 확인 카드 done — "이번 달에도 나갔나요?"(서버 `stage=ask` 만 · 금액 고쳐 확인 · 이번 달은 안 나가요) + 예정 한 줄 · `/household/templates`(만들기 · 고치기 · 그만 적기 · 상한은 서버 `limit`) | `features/manage-recurring` · `pages/recurring` |
| FR-7 | 월 마감 리뷰 3문항 · 할부 띠 done(공제는 S2 content 뒤) — 닫을 수 있나 · 문항은 서버 값, 닫은 달은 같은 칸으로 답 고치기 | `features/close-month` · `entities/household` `InstallmentBand` |
| FR-8 · 9 | S1c | |

분류 칩은 `entities/household` 로 내렸다(`a4b3936b`) — 지출 적기와 템플릿이 같은 칩. 번들(Next 표, First Load JS): `/household` ~~149~~ 157 · `/household/templates` 131 kB(새) · 공용 103 kB.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-03 | MONEY-F2(`FE-REQ-054`) — 이 REQ 에 걸린 몫(`FE-REQ-054`) — 가계부 탭은 `APP_TABS` `readyBy: "FE-REQ-057"`(비활성). 첫 화면이 생기면 `readyBy: null` · zone 레이아웃에 `AppShell` + `VIEW_TRANSITION_CSS` · 설정을 vanilla-extract 로 |
| 2026-11-04 | F4a — in-progress(`df45ae7d`). FR-1~3 · 5 · 6 · 10 done · 4 · 7 일부. 수용 기준 4/4 |
| 2026-11-04 | 리뷰 반영 `b147221e` — 목표 시계 다시 묻기 실패 시 "계산 중" 멈춤 → 줄 지움(Playwright route 로 성공 · 실패 둘 다 실측) · 엔티티 슬라이스 `expense` → `household`(서버 컨텍스트와 같은 이름) · 번들 `/household` 149 kB |
| 2026-11-04 | `acbdf825` — 예산 화면이 저장해 둔 50/30/20 의 모으기 몫을 다시 열면 안 보이던 결함. 소유자 QA 행 닫음(소유자 전용 칸 없음 · 임시 사용자 실화면) |
| 2026-11-04 | F4b — FR-4 · FR-7(리뷰 · 할부) done(`a4b3936b` · `d31bff89`). 실화면(임시 사용자) 확인 카드 · 금액 고친 확인 · 템플릿 셋 · 지난 달 닫기 · 4폭 × 3화면 넘침 0 · 콘솔 0 |

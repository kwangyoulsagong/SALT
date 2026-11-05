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
| FR-6 | 예산 방식 고르기 · 봉투 편집. 초과는 회색 음수 — 빨강 · 경고 아이콘 · 팝업 0. 통장 쪼개기(소득 · 생활비 · 저축 · 비상금 칸 + 서버가 준 급여 통장 몫 한 줄) — **2026-11-05 S1f** | FR-6 |
| FR-7 | `/household/month/[ym]` — 착지 구간 + 지난달 적중 · 월 마감 리뷰 3문항 · 할부 띠 · 공제 계기판("추정" · 기준 연도) | FR-7 · 9 · 10 · 11 |
| FR-8 | 감정 태그 · 만족도 거울 · 사람 장부 · 노동시간 환산(끄고 켬) | FR-13~15 |
| FR-9 | 재미 — 챌린지(내가 고름 · 언제든 종료 · 실패 표시 0) · 달력 스티커(연속 일수 0) · 이야기 카드(공유 시 금액 가림 기본) | FR-16 · 19~21 |
| FR-10 | 저장 실패 시 입력값 보존 | UX |
| FR-12 | 내 분류 — 예산 화면에서 만들기(이름 · 묶음) · 고치기 · 지우기(보관 — 지난 지출 이름은 남는다는 문장). 칩 · 봉투 칸에 보관 안 한 내 분류, 지출 · 할부 · 고정비 · 다음 날 묻기 · 템플릿 줄에 그 이름(월 화면은 서버 HTML 부터). 상한 · 이름 규칙은 서버 — **신설 2026-11-05 S1f** | FR-6 |
| FR-11 | 고정비 후보 카드("매달 나가는 돈 같아요" — 매달 적기로 · 아니에요 · 되돌리기, 무엇이 후보인지 · 올랐는지는 서버) · 내역 줄 "평소보다 큼 · 이 분류 보통 N원"(서버 판정) — **신설 2026-11-04 S1e** | FR-12 |

## Acceptance Criteria

- [x] 한 건 입력 3탭 이내(실측 기록)
- [x] 예산 초과 화면에 경고 색 · 팝업 0
- [x] 붙여넣기 원문이 localStorage · 로그 · 에러 리포트 0
- [x] 연속 일수 표시 0 · 챌린지 실패 표시 0(~~두 화면은 S1b — 지금 화면에 해당 표시 0~~ **정정 2026-11-04** 달력은 S1c — 연속 일수 칸 · 문구 0 을 서버 · 실화면으로 확인, 챌린지는 S1d — **2026-11-04 S1d** 챌린지 카드에 실패 · 성공률 · 연속 칸 0(응답 낱말 테스트) · 끝난 카드도 같은 색 · 실화면 확인)

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
| FR-8 · 9 | S1c — **정정 2026-11-04** 감정 · 거울 · 노동시간 · 무지출 달력은 F4c 닫힘, 챌린지는 S1d(F4d) 닫힘, 사람 장부 · 이야기 카드는 ~~S1d~~ ~~S1e~~ ~~S1f~~ S1g(정정 2026-11-05 — S1f 는 내 분류 · 통장 쪼개기)(정정 2026-11-04 — S1e 는 고정비 · 이상치만) — **정정 2026-11-05** S1g 는 이야기 카드만 닫았다(`MONEY-S1g-household-story-slice.md`), 사람 장부 · 리볼빙은 S1h | |

분류 칩은 `entities/household` 로 내렸다(`a4b3936b`) — 지출 적기와 템플릿이 같은 칩. 번들(Next 표, First Load JS): `/household` ~~149~~ ~~157~~ 158(수정 `d91cb8db` 뒤) · `/household/templates` 131 kB(새) · 공용 103 kB.

## 구현 현황 — F4c (2026-11-04, `requirements/specs/done/MONEY-S1c-household-mirror-slice.md`)

| FR | 상태 | 어디 |
|---|---|---|
| FR-8 감정 · 만족도 거울 | **done** — 바로 적기에 "그때 기분(선택)" 칩(키는 서버 `emotions`) + 산 직후 만족 1~5 · "어제 단 기분, 지금은 어때요?" 카드(물을 항목은 서버) · 기분별 만족 거울(점수별 건수 막대 — 색 하나 · 평균 0) · 내역 줄 기분 낱말 | entities `EmotionChips` · `FeltScale` · `FeelingMirror` · features `answer-feeling` |
| FR-8 노동시간 | **done** — 예산 화면 "근무 시간으로 보기"(시급 · 월급 · 월 근무 시간, 끄고 켬) · 저장 결과 "이번 지출 = 근무 N분" · 달 합 · 내역 줄. 계산은 서버, 화면은 분 → "N시간 M분" 글자만 | features `set-work-hours` · `formatWorkMinutes` |
| FR-9 달력 스티커 | **done(무지출)** — 안 쓴 날 달력(칸 상태 · 표시 가능 · 요일 자리는 서버) · 누르면 표시 · 지우기 · 연속 일수 0 | entities `NoSpendCalendar` · features `mark-no-spend` |
| FR-8 사람 장부 · FR-9 챌린지 · 이야기 카드 | ~~S1d~~ **정정 2026-11-04** 챌린지는 S1d(F4d) 닫힘, 사람 장부 · 이야기 카드는 ~~S1e~~ ~~S1f~~ S1g(정정 2026-11-05 — S1f 는 내 분류 · 통장 쪼개기)(정정 2026-11-04 — S1e 는 고정비 · 이상치만) — **정정 2026-11-05** S1g 는 이야기 카드만 닫았다(`MONEY-S1g-household-story-slice.md`), 사람 장부 · 리볼빙은 S1h | 슬라이스 범위 밖 |
| 지난 지출에 기분 붙이기 · 바꾸기 화면 | API 만 — 내역 줄 디자인과 겹친다 | `FE-REQ-060` |

## 구현 현황 — F4d (2026-11-04, `requirements/specs/done/MONEY-S1d-household-challenge-slice.md`)

| FR | 상태 | 어디 |
|---|---|---|
| FR-9 챌린지 | **done** — `/household/challenges`: 고르기(예시 = 서버 키 · 이름 칸 · 날짜 칸 둘 — min · max 는 서버 `today` · `startMax`, 상한은 서버 `canStart`) · 카드(단계 배지 · 기간 · 한 날 수 · 아낀 돈 합 · 보탠 합 — 서버 숫자) · 오늘 했어요(서버 `todayMarkable` · `today`) · 아낀 돈 적기 · 지우기 · 목표에 보태기(목표만 고름 — 금액은 안 보냄, 목표 목록 null 이면 그 칸만 안내) · 그만두기(확인 창 0). **실패 · 성공률 · 연속 0**, 끝난 카드도 같은 색 · 아래 묶음으로만 | entities `ChallengeHead` · features `start-challenge` · `track-challenge` · pages `challenges` |
| FR-9 챌린지 스티커 | **done** — 달력 칸에 같은 회색 테두리 동그라미(무지출 점과 모양으로만 가름) · 머리에 "챌린지 한 날 N일" · 칸 이름에 "챌린지 한 날" | entities `NoSpendCalendar` |
| FR-8 사람 장부 · FR-9 이야기 카드 | ~~S1e~~ ~~S1f~~ S1g(정정 2026-11-05 — S1f 는 내 분류 · 통장 쪼개기)(정정 2026-11-04 — S1e 는 고정비 · 이상치만) — **정정 2026-11-05** S1g 는 이야기 카드만 닫았다(`MONEY-S1g-household-story-slice.md`), 사람 장부 · 리볼빙은 S1h | 슬라이스 범위 밖 |

번들(Next 표, First Load JS): `/household/challenges` 153 kB(새) · `/household` 160 → 161 kB · 공용 102 kB. 가계부 첫 화면 머리에 "챌린지" 링크(다른 머리 링크와 같은 글자 링크).

## 구현 현황 — F4e (2026-11-04, `requirements/specs/done/MONEY-S1e-household-fixed-cost-slice.md`)

| FR | 상태 | 어디 |
|---|---|---|
| FR-11 고정비 카드 | **done** — 이번 달 화면 착지 아래. 줄마다 가맹점 · 분류 · "N번 · 지난번 금액 · 다음은 날짜쯤" · 올랐으면 "앞 달 X원보다 Y원 올랐어요"(같은 색 · 경고 0) · 매달 적기로(서버 칸 그대로 템플릿 — 확인하고 적기) · 아니에요(숨김 → 한 줄 + 되돌리기). 새 동작이 지난 결과 · 실패 줄을 지운다. 가맹점 이름에 조사 0 | entities `FixedCostHead` · features `find-fixed-cost` · pages `household` |
| FR-11 평소보다 큼 | **done** — 내역 줄 배지 "평소보다 큼" + "이 분류 보통 N원"(서버 `typicalAmount` 가 있을 때만) | entities `ExpenseList` |
| FR-8 사람 장부 · FR-9 이야기 카드 | ~~S1f~~ S1g(정정 2026-11-05 — S1f 는 내 분류 · 통장 쪼개기) — **정정 2026-11-05** S1g 는 이야기 카드만 닫았다(`MONEY-S1g-household-story-slice.md`), 사람 장부 · 리볼빙은 S1h | 슬라이스 범위 밖 |

번들(Next 표, First Load JS): `/household` 161 → 162 kB · 공용 103 kB.

## 구현 현황 — F4f (2026-11-05, `requirements/specs/done/MONEY-S1f-household-categories-accounts-slice.md`)

| FR | 상태 | 어디 |
|---|---|---|
| FR-12 | **done** — 예산 화면 "내 분류" 패널(목록 · 고치기 · 지우기 · 만들기 · `n / 상한`) · 409 · 400 코드 → 문장 · 결과 줄은 줄이 사라져도 남음 · 이름은 `useCategoryLabel` 한 곳(월 화면은 `CategoryNamesProvider` 에 `month.categories`, 다른 화면은 분류 표 조회 하나) · 칩은 기본 12 를 바로 그리고 내 분류를 뒤에 · 고치는 템플릿의 보관한 분류는 칩 하나로 남김 | features `manage-categories` · entities `CategoryNames` · `CategoryChips` · pages `budget` · `household` |
| FR-6 통장 쪼개기 | **done** — 방식 셋 · 소득 + 통장 셋 칸 · 저장한 예산이 같은 방식이면 서버 `salaryShare` 한 줄 · 봉투 이름 "급여 통장(고정비)" · "생활비 통장" | features `edit-budget` · entities `EnvelopeList`(`ACCOUNT_LABEL`) |
| FR-8 사람 장부 · FR-9 이야기 카드 | S1g — **정정 2026-11-05** S1g 는 이야기 카드만 닫았다(`MONEY-S1g-household-story-slice.md`), 사람 장부 · 리볼빙은 S1h | 슬라이스 범위 밖 |

번들(Next 표, First Load JS): `/household` 162 → 163 kB · `/household/budget` 134 kB · 공용 103 kB.

## 구현 현황 — F4g (2026-11-05, `requirements/specs/done/MONEY-S1g-household-story-slice.md`)

| FR | 상태 | 어디 |
|---|---|---|
| FR-9 이야기 카드 | **done** — `/household/story/[period]`(달 · 해 — 형식 · 미래면 404) · 첫 카드는 서버가 쿠키로(내 분류 이름은 받은 표로) · 문장은 `storyText` 한 곳(화면 카드 = 공유 이미지) · "금액 보이기" 꺼진 채 시작 · 가린 금액은 "가린 금액"으로 읽힘 · 이미지로 공유(파일 공유가 되면 공유 시트, 아니면 저장 · 시트를 못 열어도 저장 `eb9dc877` · 시트를 닫으면 문구 0) · 빈 기간은 카드만 · 볼 수 있는 날은 서버 `readyOn` · 가계부 머리 "이야기 카드" 링크 · 카드 아래 "이 달 가계부" · "올해 이야기 보기" | entities `StoryCard` · `storyText` · `useHouseholdStory` · features `share-story` · pages `story` |
| FR-8 사람 장부 · FR-7 공제 | S1h · S2 content 뒤 | 슬라이스 범위 밖 |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-03 | MONEY-F2(`FE-REQ-054`) — 이 REQ 에 걸린 몫(`FE-REQ-054`) — 가계부 탭은 `APP_TABS` `readyBy: "FE-REQ-057"`(비활성). 첫 화면이 생기면 `readyBy: null` · zone 레이아웃에 `AppShell` + `VIEW_TRANSITION_CSS` · 설정을 vanilla-extract 로 |
| 2026-11-04 | F4a — in-progress(`df45ae7d`). FR-1~3 · 5 · 6 · 10 done · 4 · 7 일부. 수용 기준 4/4 |
| 2026-11-04 | 리뷰 반영 `b147221e` — 목표 시계 다시 묻기 실패 시 "계산 중" 멈춤 → 줄 지움(Playwright route 로 성공 · 실패 둘 다 실측) · 엔티티 슬라이스 `expense` → `household`(서버 컨텍스트와 같은 이름) · 번들 `/household` 149 kB |
| 2026-11-04 | `acbdf825` — 예산 화면이 저장해 둔 50/30/20 의 모으기 몫을 다시 열면 안 보이던 결함. 소유자 QA 행 닫음(소유자 전용 칸 없음 · 임시 사용자 실화면) |
| 2026-11-04 | F4b — FR-4 · FR-7(리뷰 · 할부) done(`a4b3936b` · `d31bff89`). 실화면(임시 사용자) 확인 카드 · 금액 고친 확인 · 템플릿 셋 · 지난 달 닫기 · 4폭 × 3화면 넘침 0 · 콘솔 0 |
| 2026-11-04 | `d91cb8db` — 화면을 연 채 다시 받아온 새 확인 항목의 금액 칸이 비어 "나갔어요"가 눌리지 않던 결함(Playwright 재현) → 보이는 항목마다 서버 금액으로 채우는 한 길(`fillIfEmpty`) · 처음 값도 같은 서식. 번들 `/household` 158 kB |
| 2026-11-04 | F4c — FR-8(감정 · 거울 · 노동시간) · FR-9(무지출 달력) done(`f0c8793d`). 실화면(임시 사용자) 묻기 → 답 · 안 쓴 날 표시 · 기분 칩 저장 → 근무 30분 · 4폭 × 3화면 넘침 0 · 웹뷰 390 · 콘솔 0 · route 로 로딩 · 실패 |
| 2026-11-04 | `841e1b65` — 안 쓴 날 달력 · 기분별 만족이 화면 읽기에 안 읽히던 결함(grid 에 row 없음 · `aria-label` 만) → 목록 항목 + 숨긴 글자. 접근성 트리로 확인 |
| 2026-11-04 | F4d — FR-9 챌린지 · 챌린지 스티커 done(`23d44bb6`). 실화면(임시 사용자 둘) 고르기 → 오늘 했어요 → 아낀 돈 → 보태기 → 그만두기 · 달력 동그라미 · 4폭 × 2화면 넘침 0 · 웹뷰 390 · 접근성 트리 · route 로 로딩 · 실패 5가지 |
| 2026-11-04 | `dc476f8d` — 챌린지 카드 실패 줄이 다음 동작이 성공해도 남던 결함(실패 상태인 동작 아무거나를 골랐다) → 새 동작 시작 때 다른 동작 실패를 지움. route 로 고치기 전 · 뒤 둘 다 확인 |
| 2026-11-04 | F4e — FR-11 신설 · done(`b1d14ed6`). 실화면(임시 사용자) 후보 2 · 숨기기 · 되돌리기 · 매달 적기로 → 템플릿 화면 · 평소보다 큼 줄 · 4폭 넘침 0 · 웹뷰 390 · route 로 실패 → 다른 성공에 지워짐 |
| 2026-11-05 | F4f — FR-12 신설 · done · FR-6 통장 쪼개기(`3269eef3`). 실화면(임시 사용자) SSR 이름 · 칩 · 봉투 · 같은 이름 409 문장 · 만들기 · 고치기 · 지우기 · 급여 몫 갱신 · 4폭 × 3화면 넘침 0 · 웹뷰 390. 내 분류 패널 폭을 편집기와 같은 640 으로 |
| 2026-11-05 | `6b1aa765` — F4f 확인 단계: 소득 초과 거절이 까닭 없이 "저장 못 했어요"(코드 읽기로 발견) → 까닭 문장 · 지우기 실패 문장 · "내 분류" 영역 이름 이중(접근성 트리). route 로 로딩 · 실패 다섯 가지 · 보관한 분류 템플릿 고치기 실화면 |
| 2026-11-05 | `65cc66ad` — 지운 분류 봉투 칸 "(지운 분류)" 유지(비우면 빠짐) · 지운 분류 고정비 후보는 그 줄에서 분류를 골라 매달 적기로(고르기 전 버튼 꺼짐). 사용자 "베스트케이스로" — 실화면 확인 |
| 2026-11-05 | F4g — FR-9 이야기 카드 done(`1c46db88`). 실화면(임시 사용자) 서버 HTML 카드 · 가림 기본 · 켜면 금액 · 이미지 저장 둘 · 공유 시트 셋(흉내) · 4폭 × 4화면 넘침 0 · 웹뷰 390 · route 로딩 · 500 · 빈 기간. 확인 중 결함 4 고침(같은 이름 영역 · 이번 달 링크 · 빈 기간 버튼 · 공유 실패 문장) |
| 2026-11-05 | `eb9dc877` — F4g 확인 단계: 공유 시트 거절(`NotAllowedError`) · 실패면 저장으로 넘어간다("공유하지 못했어요" 문장 지움) · 저장 주소는 다음 틱에 푼다. 실화면 공유 넷 다시 |

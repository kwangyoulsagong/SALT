# FE-REQ-076 체크리스트 — 데스크톱도 휴대폰 같은 느낌으로(1단계)

확인: 2026-11-20 `feat/fe-req-076-desktop-mobile-feel` · zone 넷 운영 빌드(`ops/salt.sh web prod web web-savings web-household web-mobile`) · 셸 `127.0.0.1:3100` ·
설치 Chrome(Playwright) 1440 · 1280 · 1024 · 휴대폰 390 · 임시 계정(초대 코드 → `qa076-…`, 목표 2 · 넣기 2 · 지출 4 — 끝나고 앱 삭제 경로로 지움 · 초대 코드 지움 · 사용자 행 0 확인).

## FR

| FR | 구현 위치 | 결과 |
|---|---|---|
| FR-1 카드 판 | `web-shared/src/ui/PageFrame` `surface="cards"`(`cardsSurface`) · 홈 · 저축 · 가계부 · 알림 · 설정 페이지 | [x] 패널 자리 grey100 · 사이드 선 없음. 투자 zone 은 안 씀(코드 grep — `surface="cards"` 는 셸 · savings · household 만) |
| FR-2 카드 한 벌 | `surface.css` `card` · 판 위 공용 `panel` · `detailPanel` 은 `PageFrame.css` globalStyle · 사이드 직계 자식 = 카드 | [x] 모서리 20 · 선 0 |
| FR-3 아이콘 판 | `surface.css` `iconTile` · `iconTileSm` — 홈 카드 머리 · 홈 최근 기록 행 · `SideRow`(전 zone 사이드 행) | [x] |
| FR-4 금액 카드 | `@repo/ui` `SummaryBand` `icon` · `GoalsBoard`(`ranking`) · `HouseholdBoard`(`household`) · 스토리 `AmountCard` · `AmountCardWithoutHero` | [x] 1280 이상 오른쪽 타일 · 아래 폭은 금액 아래 한 줄(1024 실측에서 왼쪽 선이 남던 것 고침). 주인공 없으면 띠 그대로 |
| FR-5 홈 카드 | `entities/home` `HomeSummaryCardView` · `HomeFeedView` · 알약 문구 `@repo/core/labels` `HOME_CARD_PILL_LABEL`(휴대폰 홈과 한 벌로 옮김) | [x] 주인공 24 · 넣기/적기 알약 · 빈 카드(첫 행동 버튼)는 셰브론 |
| FR-6 목록 행 판 | `entities/goal` `goalRow.css` · `entities/household` `board.css` `plate` 32 → 40 · 모서리 12 | [x] 휴대폰 44 그대로 |
| FR-7 묶음 카드 | 저축 `goals.css` `section` · 미리보기 상자 면 · 선 제거 · `goal.css` 정보 상자 선 0 · 도구 셋 한 카드(`GoalsSide`) / 가계부 `household.css` `card` · `section` · 고른 날 상자 선 0 / 알림 `PageFrame` + 공용 패널 / 설정 공용 패널 | [x] |
| FR-8 규칙 | `screen-desktop.md` §1-1 카드 판 · §2 가격 단 | [x] 108줄 |

## 측정

| 항목 | 결과 |
|---|---|
| 가로 넘침 | 0 — 1440(홈 · 저축 · 가계부 · 알림 · 설정) · 1280 · 1024(홈 · 저축 · 가계부) · 390(`/m` 홈 · 저축 · 가계부) |
| 페이지 오류 | 0 |
| 휴대폰 대조 | `/m` 홈 · 저축 · 가계부 390 — 전/후 스크린샷 배치 변화 0(바꾼 공용 조각은 `ON_MOBILE` 값이 이김) |
| 투자 zone | 코드상 영향 0 — `SummaryBand` 는 `icon` 을 줄 때만 · 판 규칙은 `cardsSurface` 안만 · `SideRow` 는 투자에서 안 씀(grep) |

## 검증 명령

| 명령 | 결과 |
|---|---|
| `pnpm check-types` | 14/14 |
| `pnpm lint` | 14/14(1회차 안 쓰는 import 경고 → 고침) |
| `pnpm test` | 7/7(글자 래칫 포함) |
| `pnpm test:layer-check` | 차단 22 · 통과 15 |
| `@repo/ui` `build-storybook` | 통과 |
| zone 운영 빌드 | web · web-savings · web-household · web-mobile 통과 · 기동 |
| `node scripts/check-done.mjs` | 커밋 전 마지막에 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| ~~하위 화면(목표 상세 · 추가 · 가계부 하위 7) · 금융 팁~~ | **닫힘 — 아래 2단계** | — |
| 글래스 | 데스크톱에 떠 있는 하단 탭이 없고 머리는 투자 공용 틀 | 사용자 결정 시 |
| ~~투자 zone 실화면 대조~~ | **닫힘(2회차)** — 이 브랜치로 투자 · 팁 zone 운영 빌드 · `/investments` · `/portfolio` · `/investments/BTC` 흰 면 그대로 | — |
| 금액 카드 요약 실패(주인공 없음) 실화면 | 요약은 서버 컴포넌트가 받아 Playwright `route` 로 못 끊는다 — 띠 경로는 이 PR 이 안 바꾼 코드 · Storybook `AmountCardWithoutHero` 로 봄 | BFF 를 끄는 확인이 필요해지면(운영 프로세스를 멈춰야 해서 하지 않음) |

## 검증 2회차(2026-11-20 — 사용자 "파이프라인 다하구 버그 검증 다했지?")

1회차에 안 본 것: 공용 부품 소비처 · 빈 상태 · 대기 칸 높이 · 360. 빈 계정 · 데이터 계정 둘(끝나고 지움 · 사용자 행 0 · 초대 코드 0).

| 확인 | 결과 |
|---|---|
| 공용 소비처 — 투자 · 팁 zone 이 브랜치로 운영 빌드 | 통과 · `/investments` · `/portfolio` · `/investments/BTC` 배치 변화 0 · 목표 상세(`SideRow` · 정보 상자) 넘침 0 · 오류 0 |
| **버그 ① 저축 빈 상태 예시 상자** | 회색 판 위 회색 상자 + 안쪽 선이라 판과 구별 안 됨 → 흰 카드(모서리 20 · 선 0) · 틀 고르기 칸도 모서리 20 · 선 0 |
| **버그 ② 가계부 빈 상태 예시 상자** | 카드 안 상자에 안쪽 선(카드 안 카드) → 면만 |
| **버그 ③ 저축 금액 카드 대기 칸 높이** | 84 인데 실제 카드 112(1280 이상) · 190(1024) — 도착 때 아래가 밀림 → 폭별 높이(실측 값). 가계부는 본문 통째 대기 480 이라 해당 없음 |
| 휴대폰 360 | `/m` 홈 · 저축 · 가계부 넘침 0 · 오류 0 |
| 재검증 | `check-types` 14/14 · `lint` 14/14 · `test` 7/7 · savings · household 운영 빌드 · 빈 상태 다시 찍음 |

## 2단계(2026-11-20 `feat/fe-req-076-stage2-subscreens`) — 하위 화면 · 팁

확인: zone 여섯 운영 빌드(`ops/salt.sh web prod` — 공용 `surface.css` · `Skeleton` 이 바뀌어 전부) · 셸 `127.0.0.1:3100` · 설치 Chrome(Playwright · 줄인 모션 — 등장 애니메이션 중간 캡처를 피함) ·
임시 계정 둘(초대 코드 → `qa076b-…` 목표 2 · 넣기 1 · 지출 4 · 매달 1 · 챌린지 1 · 사람 장부 1 · 리볼빙 1 / `qa076e-…` 빈 계정 — 끝나고 지움).

| FR | 구현 위치 | 결과 |
|---|---|---|
| FR-9 하위 화면 판 | `AddGoalPage` · `GoalDetailPage` · `NewExpensePage` · `BudgetPage` · `RecurringPage` · `ChallengesPage` · `StoryPage` · `RevolvingPage` · `PeoplePage` `surface="cards"` · 맨몸 묶음 카드(`addGoal.css` `inputs` · `outcome` · `goalDetail.css` `asideBlock` · `newExpense.css` `body` · `budget.css` `editorCard` · `TemplateList` · `PeopleBoard` · 끝난 챌린지 · 리볼빙 묶음) | [x] |
| FR-10 폼 상자 한 벌 | `surface.css` `formBox` · `lineCard`(`toolCard` 도 이것) · 판 규칙 `PageFrame.css` 셋(판 위 · 카드 안 · 사이드 직계) · 기능 10(`close-month` · `manage-recurring` · `manage-revolving` · `record-gift` · `set-occasion-envelope` · `set-work-hours` · `start-challenge` · `track-challenge` · `find-fixed-cost` · `answer-feeling`) + `compare-emergency` · `add-goal` 결과 · 팁 셋 | [x] 1단계가 놓친 가계부 "이 달 더 보기" 안 이 달 닫기 선(카드 안 카드)도 같이 닫힘 |
| FR-11 판 위 대기 칸 | `@repo/ui` `Skeleton` `data-skeleton` · `PageFrame.css` 대기 칸 규칙 | [x] **결함** — 바꾸기 전 지연(`route` 6초)에서 챌린지 · 리볼빙 · 사람 장부 · 예산 대기 칸이 판과 같은 회색이라 0 픽셀로 보임 → 흰 카드 모양 |
| FR-12 팁 | `TipsPage` `listCard` · `TipDetailPage` `body` · `QuizCardsPage` `board` · `tip.css` `meta` · `quiz.css` · `myNumbers.css` → `formBox` | [x] 공개 화면은 아래 "가짜 응답" |

### 측정

| 항목 | 결과 |
|---|---|
| 카드 판 안 안쪽 선 상자(계산 스타일 `0 0 0 1px inset`, 입력 · 버튼 제외) | **0** — 1440 · 1280 · 1024 × 14경로(하위 9 · 월 화면 · `/household` · `/goals` · `/tips` · `/tips/cards`) + 빈 계정 12경로. 탐지식은 투자 상세에서 4개를 잡아 동작 확인(첫 판은 Chrome 계산 값 순서 `rgba(...) 0px 0px 0px 1px inset` 를 몰라 0 이 거짓으로 나왔다 — 고쳐 다시 셈) |
| 가로 넘침 · 페이지 오류 | 0 · 0 — 위 전부 + 휴대폰 |
| 빈 상태(빈 계정) | 챌린지 · 매달 · 리볼빙 안내 상자 = 흰 카드 · 사람 장부 "적은 게 없어요" 카드 안 · **결함** 지출 적기 사이드가 머리만 있는 빈 카드 → 빈 목록 한 줄(`recentEmpty`) |
| 로딩 · 실패(`route` 지연 6초 · 끊기) | 챌린지 · 리볼빙 · 사람 장부 · 예산: 대기 칸 흰 카드(FR-11) · 실패 "불러오지 못했어요" 보임 |
| 금융 팁 공개 화면 | 운영 플래그(`CONTENT_PUBLIC`)를 켜지 않음 — DB `content.tip` 6글로 만든 가짜 응답(목록 · 글 · 확인 필요 1 · 맞혀 보기 · 바뀐 것)을 주는 프록시 + 같은 빌드를 별도 포트로 띄워 1440 · 1024: 선 상자 0 · 넘침 0 · 오류 0. 사이드 깨진 아이콘 · "불러오지 못했어요" 는 별도 포트라 셸 정적 파일 · 세션이 없어서(코드 아님) |
| 휴대폰 `/m` 390 · 360 | 홈 · 저축 · 목표 상세 · 가계부 넘침 0 · 오류 0 · 같이 쓰는 폼 상자 계산 값 12 × 16 · 모서리 12 · 안쪽 선 그대로(`/m/household` 묻는 카드) |
| 투자 zone | 새 공용 조각을 안 씀(grep) · `/investments` · `/portfolio` · `/investments/BTC` 넘침 0 · 오류 0 · 선 상자 그대로 |

### 검증 명령

| 명령 | 결과 |
|---|---|
| `pnpm check-types` | 14/14 |
| `pnpm lint` | 14/14(1회차 안 쓰는 `SURFACE` import 경고 → 지움 · prettier 가 상관없는 줄을 감싼 두 파일은 되돌리고 손으로) |
| `pnpm test` | 7/7(`@repo/ui` 99 — 글자 래칫 포함) |
| `pnpm test:layer-check` | 차단 22 · 통과 15 |
| `@repo/ui` `build-storybook` | 통과 |
| zone 운영 빌드 | 여섯 통과 · 기동 |
| `node scripts/check-done.mjs` | 커밋 전 마지막에 |

### 미검증 · 범위 밖(2단계)

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 팁 공개 화면 · 운영 데이터 경로 | 공개는 법무 확인 뒤 사용자 결정(`FE-REQ-058`) — 플래그를 켜지 않고 가짜 응답으로 배치만 봄 | 공개 플래그를 켤 때 |
| 판 위 실패 문장 | 실패 "불러오지 못했어요" 가 카드 없이 판 위 가운데 — 읽히고 높이를 지켜 그대로 둠 | 실패 상태를 카드로 싸자는 결정 시 |
| 글래스 | 1단계와 같음 | 사용자 결정 시 |

## 2단계 검증 3회차(2026-11-21 — 사용자 "실수로 메인으로 옮겼어 다시 브랜치 옮기고 파이프라인 검증 및 버그 검증")

브랜치 복귀: main 에 새 커밋 없음 · 변경 72 파일은 커밋 전 작업 트리에 그대로 → `feat/fe-req-076-stage2-subscreens` 로 옮김(같은 커밋 `abb6471e`). zone 여섯을 이 브랜치로 다시 운영 빌드.
2회차까지 안 본 것: 768~1023 폭 · 열린 상태(편집기 · 모드) · 실제 동작 · **같은 열 카드 폭**. 임시 계정 둘(`qa076r-…` 데이터 · `qa076s-…` 빈 — 끝나고 지움).

| 확인 | 결과 |
|---|---|
| **버그 ④ 예산 900 — 사이드 카드 폭** | 사이드가 본문 아래로 내려가면 "근무 시간으로 보기"만 560(폼 상자 글 폭 상한이 사이드 카드에 남음) → 판 규칙 사이드 직계 `maxWidth: none` |
| **버그 ⑤ 지출 적기 900 — 입력 카드 560 · 아래 카드 꽉 찬 폭** | 입력 카드 상한 지움(1280 이상은 격자 칸이 560) |
| **버그 ⑥ 사람 장부 900 — 폼 720 · 목록 카드 꽉 찬 폭** | 목록 묶음 카드 720(`people.css` `block`) |
| **버그 ⑦ 챌린지 · 리볼빙 빈 계정 1280 미만 — 폼 720 · 안내 꽉 찬 폭** | 안내 상자 720(`empty`) |
| 같은 열 카드 폭(계산 값) | 지출 적기 · 예산 · 챌린지 · 리볼빙 · 매달 · 사람 장부 · 목표 만들기 × 900 · 1024 · 1280 · 1440 × 계정 둘 — **56/56 일치** |
| 판 안 선 상자 · 넘침 · 오류 · 로그인 튕김 | 15경로 × 4폭 × 계정 둘 실패 0(검사기 양성 대조 — 투자 상세 선 상자 잡힘) |
| 열린 상태 | 리볼빙 "새 명세서" · 매달 "새로 적기" · "고치기" · 사람별 보기 · 예산 50/30/20 · 통장 쪼개기 — 선 상자 0 · 오류 0 |
| 실제 동작 | 지출 적기 저장 → 사이드 최근 쓴 내역에 바로 보임 · 챌린지 "오늘 했어요" |
| 로딩 · 실패(`route`) | 대기 칸 보임(판과 다른 면) · 실패 문장 보임 — 4화면 |
| 1단계 화면 | 홈 · 저축 · 가계부 · 알림 · 설정 선 상자 0 · 오류 0 |
| 휴대폰 390 · 360 | 홈 · 가계부 · 저축 · 목표 상세 넘침 0 · 오류 0 · 폼 상자 값 그대로 |
| 명령 | `check-types` 14/14 · `lint` 14/14 · `test` 7/7 · 레이어 22 · 15 · zone 운영 빌드 · `check-done` |

## 2026-11-26 `FE-REQ-062` 걸침

- [x] 금액 카드(`SummaryBand`) 주인공 금액이 바뀔 때 굴림 — 실측 지출 45,000원 적기 뒤 199,500 → 244,500원 0.24초 15프레임 — 실화면 1440 15화면 · 390 4화면 · 줄인 모션 — 측정은 `checklists/FE-REQ-062.md`

## 2026-11-26 — 데스크톱 홈 대시보드 · 저축 목록 채우기 · 머리 간격(`F000-desktop-dashboard`, `feat/fe-home-desktop-polish`)

- 파일만 걸침 — 카드 판 파일 머리(값 무변경). 검증은 루트 체크리스트
- 미검증: 없음(이 몫 안)

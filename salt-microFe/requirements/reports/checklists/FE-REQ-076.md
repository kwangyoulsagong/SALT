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
| 하위 화면(목표 상세 · 추가 · 가계부 하위 7) · 금융 팁 | 1단계 범위 밖(REQ 범위 밖 표) | 이 REQ 2단계 PR |
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

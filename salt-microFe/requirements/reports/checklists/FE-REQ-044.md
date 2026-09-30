# FE-REQ-044 체크리스트 — 그래픽 · 모션 · 마이크로 인터랙션 (A · B · C 단계, 2026-09-30)

- REQ: `salt-microFe/requirements/specs/in-progress/FE-REQ-044-MOTION-GRAPHICS.md`
- 규칙: `salt-microFe/.claude/rules/motion.md`
- 브랜치: `feat/fe-motion-system`

## 기반

| FR | 위치 | 결과 |
|---|---|---|
| FR-1 모션 토큰 | `@repo/tokens` `motion` · `colors.graphic` / `@repo/ui` `vars.motion`(문자열) · `@repo/ui/motion` `ease` · `springs` · `durations` | 컴포넌트 안 길이 · 이징 숫자 0(`fall` 이징도 토큰으로 올렸다). 예외: 온보딩 밀림 거리 24px · 목표 완료 대기 1600ms 는 슬라이스 상수 |
| FR-2 라이브러리 | `framer-motion` 12.43 · `m` 만 | `motion/react` · `motion` 컴포넌트 import 를 web · ui ESLint `no-restricted-imports` 로 막았다 |
| FR-3 줄인 모션 | `MotionProvider`(`MotionConfig reducedMotion="user"`) · `StatusGraphic` progress 는 줄인 모션이면 투명도 깜빡임 · `ProgressStepper` CSS `prefers-reduced-motion` | 에뮬레이션(`reducedMotion: reduce`) 실측: 칩 누름 `scale none` · 시트 60ms 에 닫힘 · 404 캔들 `transform none`. 숫자 굴리기만 코드(아래 미검증) |
| FR-4 성능 | 그래픽 전부 `transform` · `opacity` · `pathLength` · 인라인 SVG | 첫 로드 JS 는 아래 §번들 |
| FR-5 SSR 마지막 프레임 | `usePlayAfterMount` + `initial={false}` → 마운트 뒤 `key` 로 재생 | `curl /` · `/nope` 서버 HTML 에 그래픽 SVG 가 들어 있다. 하이드레이션 경고 0 |

## 상태 그래픽 · 장면 · 배치 (A 단계)

| # | 위치 | 결과 |
|---|---|---|
| FR-10~12 | `@repo/ui/statusGraphic` · `@repo/ui/statusLine` · `EmptyState iconFrame="none"` | Storybook 5종 × 3크기. 250ms 프레임에 움직이는 중 · 3s 에 끝 프레임 |
| FR-20~22 | `@repo/ui/illustration` 6장면 | 350ms 프레임: 저울 기울어짐 · 장부 줄 채우는 중. 3s: 전부 끝 프레임. 문구 없음 |
| P-1 거래 기록 | `features/record-transaction` `RecordTradeCard` | "거래 기록이 등록됐어요" + 체크(저장마다 `key` 로 재생). 계획 저장 실패는 `error`. **화면 실측 안 함**(BFF 필요) |
| P-2 목표 추가 | `features/add-goal` | 실측(Playwright route): 제출 → 체크 lg 가 튀며 그려짐(120ms 대시 0 → 1.3s 1) → 1.6s 뒤 `/home`. [홈으로]로 바로 이동 가능 |
| P-3 초대 수락 | `widgets/onboarding-flow` `onAccepted` → 다음 단계 위 한 줄 | **실측 안 함**(초대 수락 · 상태 조회 둘 다 BFF) |
| P-4 온보딩 끝 | 같은 위젯 — `EmptyState` + success lg | 실측 안 함(같은 사유) |
| P-10 목표 목록 | `entities/goal` `GoalList` · `GoalSummary` | 빈 배열 → 과녁 장면 + "아직 목표가 없어요". "Loading..." · "Error loading goals"(영문) → 스켈레톤 · `StatusLine error` |
| P-11 보유 | `entities/portfolio` `HoldingSummaryList` · `InvestmentSummary` | 빈 = `empty` · 로그인 필요 = `blocked` · 실패 = `error` |
| P-12 관심 종목 없음 | `widgets/market-board` `WatchlistTab` | 기존 `EmptyState` 에 `empty` 그래픽 |
| P-13 코치 리포트 | `widgets/coach-console` `CoachReport` | 리포트 없음 → 말풍선 장면. 추천 없음 `empty` · 블록 실패 `error` · 로그아웃 `blocked` |
| P-14 블록 오류 | `shared/ui/SectionBoundary` | 인라인 하드코딩 색 → 토큰 css. 실패 `error` · 로딩 `progress` |
| P-15 404 | `app/not-found.tsx` → `pages/not-found`(레지스트리 추가) | 실측: `/nope` 캔들 장면 + "찾는 화면이 없어요" + [투자 화면으로]. 캔들 scaleY 1.035 → 0.96 → none(스프링) |
| P-20 온보딩 머리 | 단계별 `coachBubble` · `ledger` · `coinPouch` | 실측(로그아웃 = 초대 단계): 말풍선 장면 · 카드 폭 100% |
| P-21 로그인 | `pages/login` | 실측: 브랜드 아래 동전 주머니 |
| P-35 진행 막대 | `@repo/ui` `ProgressStepper` 연결선 `::after scaleX` · 현재 표식 1.08 | 코드만. 단계 전환 실측 안 함(BFF) |
| P-40 단계 밀림 | `AnimatePresence mode="wait"` ±24px | 코드만(같은 사유) |

## 번들 (첫 로드 JS, `next build`)

| 경로 | main | 1차(`motion/react`) | 최종(`framer-motion` `m` + 동적 LazyMotion) |
|---|---|---|---|
| `/` | 127 kB | 172 | **148** (+21) |
| `/home` | 150 | 200 | **175** (+25) |
| `/investments` | 132 | 177 | **152** (+20) |
| `/investments/[symbol]` | 115 | 160 | **135** (+20) |
| `/coach/report` | 110 | 154 | **130** (+20) |
| `/onboarding` | 126 | 175 | **151** (+25) |
| `/goals/addgoals` | 142 | 190 | **166** (+24) |

예산 +40 kB(`streaming-ssr.md` §7) 안. 1차는 `motion/react` 가 `import * as fm` 으로 다시 내보내 드래그 · 레이아웃까지 실렸다(청크 39 kB gz 에 `drag` 17 · `layoutId` 18회). 남은 +20 kB 는 `m` · `MotionConfig` 런타임 — 루트에 둔 대가다.

## 검증

- `pnpm check-types` 5/5 · `pnpm lint` 5/5 · `pnpm test` core 28 · ui 43 · `pnpm test:layer-check` 차단 8 · 통과 5
- `pnpm --filter web build` · `pnpm --filter web-tax build` · `pnpm --filter @repo/ui build-storybook` 성공
- 참고 서비스 이름 grep 0건(REQ · 규칙 · 코드 · 커밋)

## B 단계 — 마이크로 인터랙션

| # | 위치 | 결과 |
|---|---|---|
| P-30 누름 | `styles/press.ts`(독립 속성 `scale`) → `Chip` · `TextButton` · `Keypad` · `FilterTabs` · `SegmentedControl` · `Toggle` · `Tabs` | 실측(Storybook): 칩 누르는 동안 `scale 0.97`. 줄인 모션 `none`. `Button` 은 기존 `translateY(1px)` 유지(이전 결정) |
| P-31 미끄러짐 | `Motion/useSlidingIndicator` → `Tabs` 밑줄 · `SegmentedControl` 흰 알약 | 실측: 알약 x 2 → 5.9(80ms) → 44px · 밑줄 0 → 7.1 → 156px. 측정 전(서버 HTML)엔 항목 자신의 선택 스타일 |
| P-32 퇴장 | `Motion/usePresence` → `BottomSheet` · `Modal`(`Dialog` 포함) | 실측: Esc 뒤 80ms 에도 dialog 1개(퇴장 중) → 480ms 0개. 줄인 모션이면 60ms 에 0개. 잠금 · 포커스 가두기는 닫는 순간 풀린다 |
| P-33 별 | `StarIcon` + `useChangedAfterMount` | 켜는 순간에만 튄다. 처음부터 켜진 별은 가만히 — 앱 화면 실측 안 함(관심 종목은 로그인 필요) |
| P-34 체크 | `Checkbox` | 실측: 처음 켜진 두 개 `animation none`, 누른 것만 pop |
| P-36 숫자 | `useRolledNumber` · `NumberText animate` → 홈 보유 합계 | 코드만(보유 조회 BFF 필요). 목표 모은 돈은 서버 포맷 문자열이라 굴리지 않는다 |
| P-37 시세 | `@repo/ui/tickFlash` → `PriceCell` · `MarketSummaryCard` 현재가 | 실측(Storybook LiveTicks): 오르면 `upLight` 면 · `opacity` 만. 등락률 칸 깜빡임(0.8s)은 성능 규칙상 변경 금지라 그대로 |
| P-38 실시간 점 | `market-board` `RealtimeAsOf` | 연결 중에만 숨쉬기. 줄인 모션이면 느려진다. 실측 안 함(WS 필요) |
| P-5 저장 결과 | `set-risk-budget` · `confirm-outcome-tags` → `StatusLine` | 코드만(BFF 필요) |
| P-6 분석 완료 | `explain-symbol` `ExplainCard` 헤더 | 스트림 `done` · AI 생성일 때 "분석이 완료됐어요". 규칙 기반 대체면 안 뜬다. 코드만(SSE 필요) |
| P-16 막힘 | `entities/coach` `BlockedNotice` | **유지 — 설계 결정**(오류처럼 보이면 안 되는 정상 상태 · 정보 아이콘). 자물쇠 그래픽을 달지 않았다 |
| P-22 · 23 | 홈 온보딩 카드 · 목표 추가 머리 | 목표 추가 실측: 과녁 장면. 옛 `marginTop: 15%`(폭 기준 빈칸, FSD 이관 때 옮겨 온 값)를 24px 로 — 둘 다 두면 하단 고정 버튼이 안내를 가렸다 |

- 번들: A 단계와 같음(`/onboarding` 151 → 152 kB, 나머지 ±0)
- axe(`/` · `/onboarding` · `/nope` · `/goals/addgoals`, API 차단): 이번 변경분 0건. 첫 실측에서 404 가 `main` 중복 · `h1` 없음 → `div` + 제목 `h1` 로 고쳐 0건
- 기존 위반(이번 변경 밖, 색은 이전 결정이라 건드리지 않음): `/onboarding` 단계 라벨 · 입력 라벨 대비 6 · `/goals/addgoals` 뒤로 버튼 이름 없음(critical) · 안내 문구 대비 1 · 두 화면 `page-has-heading-one`
- 검증: check-types 5/5 · lint 5/5 · test 71 · layer-check · web · web-tax · build-storybook

## C 단계 — 남은 한 줄 · 등장 · 퇴장

| # | 위치 | 결과 |
|---|---|---|
| P-17 오류 한 줄 | 코치 판단 · 구간 · 예측 · 사건 · 쏠림 · 수익/거래 계획 · 사이즈 계산 · 리포트 패널 5 · 추천 카드 · 상세 차트 · 시세 표 · 관심 종목 (22곳, `StatusLine error`) | 코드 · lint. 앱 실측: `/coach/report`(API 차단)에서 axe 0 |
| P-18 빈 한 줄 | 청산 기록 · 수익 플랜 · 청산 플랜 · 시나리오 · 사건 · 쏠림 반응 · 채점 표본 · 미러 · 구간 제외 사유(`empty`) · 관심 종목 로그인(`blocked`) | "제공하지 않음 · 표본 적음"은 오류가 아니라 `empty`. 투자 화면 요약 띠(한 줄 높이)는 제외 |
| P-19 표 로딩 | `RealtimeMarketTable` · `WatchlistTab` | 문장 → 행 스켈레톤 8줄(`role="status"`) |
| P-39 차례 등장 | `@repo/ui/enterReveal`(`.css.ts`) → `Card` · 앱 `shared/ui/surface` `panel` | 실측 `/home`: 카드 `animation-delay` 0s → 0.04s(형제 차례). CSS 라 스트리밍으로 늦게 들어온 블록도 같은 등장 |
| FR-35 토스트 퇴장 | `ToastProvider` `leaving` → `toastLeavingStyles` 뒤 제거 | 코드만(앱에 토스트 쓰는 화면 없음) |
| 기존 애니메이션 토큰화 | 예측 팬차트 · 상세 가격 틱 · 예측 카드 · 해설 카드 5곳 | 값이 토큰과 같은 것만(900 · 400 · 240ms). 다른 값은 이전 결정이라 유지 |
| 줄인 모션 — 장면 | `/nope` 캔들 | 에뮬레이션: 60 · 150 · 1500ms 모두 `transform none`(이동 없음) |

### axe (API 차단, 7경로)

| 경로 | 결과 |
|---|---|
| `/` · `/coach/report` · `/nope` | 0 |
| `/onboarding` · `/goals/addgoals` | moderate `page-has-heading-one` 만(기존) |
| `/home` · `/investments` | serious 대비 3(기존 — 홈 절약 팁 문구 · 투자 화면 "내 코치 리포트" 링크 #8B95A1) · moderate `heading-order` |

- 이번에 고친 기존 위반(사용자 승인 2026-09-30, `c651c1c` · C 커밋): 단계 라벨 · 입력 라벨 대비, 목표 추가 안내 `subtle`, 뒤로 버튼 이름(critical), 로그아웃 상태 프로필 버튼 이름(critical)
- 이번 변경이 만든 위반 1건을 잡아 고침: 목표 목록 로딩 `div` 에 `aria-label` 만 있고 역할이 없었다 → `role="status"`
- 번들: B 단계와 같음(`/investments` 152 → 153 kB)
- 검증: check-types 5/5 · lint 5/5 · test 71 · layer-check · web · web-tax · build-storybook

## Chrome QA — 로컬 풀스택 · 로그인 상태 (2026-09-30)

서버 4000 · BFF 4001/4002 · web dev 3000, 기존 로그인 세션. 모바일 화면(홈 · 온보딩 · 목표 추가 · 404)은 420 폭 + `data-embed="app"`(앱 웹뷰와 같게), PC 화면은 1512 폭.

| 항목 | 결과 |
|---|---|
| 사용자 지적 "디자인 구리다" · "다 깨져 있다" | 온보딩을 모바일 한 열로 다시 짰다 — 점 진행 표시 · 두 줄 제목(둘째 줄 강조) · 설명 · 큰 장면 · 하단 고정 버튼(`BottomCTA`). 홈 온보딩 카드 좌우 여백 · 아래 간격 0 → 다른 카드와 같게. 빈 목표 카드 위아래 48 → 16. 404 흰 영역 70vh → 100dvh |
| 온보딩 하이드레이션 불일치(기존 버그) | `useOnboardingStatus` 가 렌더 중 `localStorage` 를 읽어 서버(토큰 없음) · 클라이언트(있음)가 달랐다 → `useHasAccessToken`(서버 · 하이드레이션 `null`). 재방문 콘솔 오류 0 |
| 홈 | 온보딩 카드 장부 장면 · 빈 목표 과녁 · 보유 없음 `StatusLine` 정상 |
| 투자 화면 | 가격 깜빡임 8초 24회 동작 확인 → **사용자 결정으로 뺐다**("가격에는 안 해도 될 듯") · 연결 점 숨쉬기 · 탭 밑줄 130 → 126 → 109 → 57 → 15 → 0(40ms 간격). 첫 전환 한 번은 바로 도착 — 첫 측정 뒤 레이아웃이 바뀐 것으로 보인다(재현 안 됨) |
| 종목 상세 | 관심 종목 별: 끌 때 가만히, 켤 때만 pop(원래 상태로 되돌림) |
| 코치 리포트 | 상태 줄(추천 없음 등) 정상 · 콘솔 오류 0 |
| P-6 "분석이 완료됐어요" | **확인 못 함** — 이 계정은 판정이 표본 부족(6건)으로 막혀 AI 해설이 닫혀 있다 |
| P-1 거래 기록 저장 | **확인 안 함** — 로컬 계정 원장에 거래가 쌓인다. 사용자 확인 후 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| P-1 · 3 · 4 · 5 · 6 · 35 · 36 · 40 앱 화면 실측(33 · 38 은 Chrome QA 로 닫힘) | 판정이 막힌 계정 · 원장에 거래가 쌓이는 조작 · 초대 수락은 새 계정이 필요 | `QA-001` · 사용자 확인 후 |
| 줄인 모션 — 숫자 굴리기 | 장면 · 누름 · 시트는 에뮬레이션으로 확인, 숫자는 코드만(보유 조회 BFF 필요) | `QA-001` |
| 남은 기존 axe 대비 3건(홈 절약 팁 · "내 코치 리포트" 링크) · 제목 순서 | 이번 변경 밖 · 색은 이전 결정 | 사용자 결정 후 |
| 토스트 퇴장 화면 실측 | 앱에 토스트를 쓰는 화면이 아직 없다 | 토스트를 쓰는 화면이 생길 때 |
| 실기기 · 저사양 프레임 | 헤드리스 Chrome 만 | `QA-001` |
| RN 모션 | 같은 토큰을 `reanimated` 로 | `RN-REQ` |

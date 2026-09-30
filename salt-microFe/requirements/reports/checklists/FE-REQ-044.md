# FE-REQ-044 체크리스트 — 그래픽 · 모션 · 마이크로 인터랙션 (A 단계, 2026-09-30)

- REQ: `salt-microFe/requirements/specs/in-progress/FE-REQ-044-MOTION-GRAPHICS.md`
- 규칙: `salt-microFe/.claude/rules/motion.md`
- 브랜치: `feat/fe-motion-system`

## 기반

| FR | 위치 | 결과 |
|---|---|---|
| FR-1 모션 토큰 | `@repo/tokens` `motion` · `colors.graphic` / `@repo/ui` `vars.motion`(문자열) · `@repo/ui/motion` `ease` · `springs` · `durations` | 컴포넌트 안 길이 · 이징 숫자 0(`fall` 이징도 토큰으로 올렸다). 예외: 온보딩 밀림 거리 24px · 목표 완료 대기 1600ms 는 슬라이스 상수 |
| FR-2 라이브러리 | `framer-motion` 12.43 · `m` 만 | `motion/react` · `motion` 컴포넌트 import 를 web · ui ESLint `no-restricted-imports` 로 막았다 |
| FR-3 줄인 모션 | `MotionProvider`(`MotionConfig reducedMotion="user"`) · `StatusGraphic` progress 는 줄인 모션이면 투명도 깜빡임 · `ProgressStepper` CSS `prefers-reduced-motion` | 코드 경로만 확인. **OS 설정 켠 실측은 안 했다**(아래 미검증) |
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

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| P-1 · P-3 · P-4 · P-35 · P-40 화면 실측 | BFF · 서버가 있어야 한다(목 제거, `fsd-app.md`) | 로컬 풀스택으로 `QA-001` 때, 또는 B 단계에서 Playwright route 로 |
| 줄인 모션(OS 설정) 실측 | 헤드리스에서 `reducedMotion` 에뮬레이션을 안 돌렸다 | B 단계 validate |
| axe | 새 그래픽은 전부 `aria-hidden` 이지만 페이지 axe 를 돌리지 않았다 | B 단계 validate |
| 실기기 · 저사양 프레임 | 헤드리스 Chrome 만 | `QA-001` |
| B 단계(P-5 · 6 · 16 · 22 · 23 · 30~34 · 36~38) · C 단계(P-17~19 · 39) | 이 브랜치 A 단계 범위 밖 | 다음 커밋들 — REQ 배치표 |
| RN 모션 | 같은 토큰을 `reanimated` 로 | `RN-REQ` |

# FE-REQ-037 (F006 MARKET SUMMARY) — 검증 체크리스트

- REQ: `salt-microFe/requirements/specs/in-progress/FE-REQ-037-F006-MARKET-SUMMARY.md`
- 브랜치: `feat/fe-market-summary-strip` (base `main` `c61b9f9`) · 검증일: 2026-09-22
- 상태: **구현 완료 · in-progress 유지** — 머지 후 done
- 환경: 로컬 서버 4000 · BFF 4001/4002 · web dev 3000(로그아웃 상태). 번들은 **프로덕션 빌드**(git worktree 두 개)

## 1. 요구사항

| FR | 판정 | 위치 · 근거 |
|---|---|---|
| FR-1 자리 · 두 탭 | pass | `widgets/market-board/ui/MarketBoard.tsx` — 제목과 `Tabs` 사이, 탭 바깥 |
| FR-2 조회 한 번 · 프론트 상수 0 | pass | `entities/market/api/useMarketQueries.ts` `useMarketSummary`. 종목 목록 · 임계 상수 파일(`summarySymbols.ts` · `model/summary.ts` · `lib/summaryTag.ts`)을 지웠다(`grep -rn "BTC\", \"ETH" apps/web/src` 0건) |
| FR-3 대표 · 작은 항목 · 로고 · `aria-label` | pass | `entities/market/ui/MarketSummaryCard/*`. 1440px 실측: 대표 BTC `115,008,000 -2,115,000 (1.81%)` + 영역 차트, 항목 6(ETH · XRP · SOL · DOGE · ADA · TRX) 3줄 × 2열 |
| FR-4 태그 · 옅은 칠 | pass (부분) | 코드 → 문구 매핑 `MARKET_SUMMARY_MESSAGES.tags`. 오늘 ±5% 종목이 없어 **실화면에 태그가 뜬 모습은 못 봤다** — 서버 단위 테스트(`wide_move`)와 코드만 |
| FR-5 실시간 · 1분 재조회 | pass | `entities/market/lib/useMarketSummaryRealtime.ts`. WS 실측 `{"symbol":"BTC","change24hAmount":-2125000,…}` — BFF 가 거래소 금액을 싣는다 |
| FR-6 링크 | pass | `ROUTES.investmentDetail` (코치 패널과 한 곳) |
| FR-7 배치 | pass | 1440 · 390 스크린샷. 대표 칸이 5:6 비율일 때 차트가 600px 로 커져 "여전히 크다" — 240px · 차트 77 고정으로. 항목 열 260 고정. 390 에서 항목 폭 240 은 변동률이 잘려 280, 대표 칸 높이는 내용(141)에 맞췄다 |
| FR-8 상태 | pass | 스켈레톤 = 띠 높이 176(모바일 240) · 청크 전 자리도 같은 높이. 실패 시 `null` |
| FR-10 대표 아래 줄 · 오늘의 시장 | pass | 1600px 실측: 고가 117,186,000 · 저가 114,454,000 · 거래대금 3,302.7억 / 상승 86 · 보합 19 · 하락 184 + 막대 + BTC 뉴스 3줄. 1280 · 390 에서 상자 숨김 |
| 스켈레톤 폭 | pass | 요약 응답을 멈춘 화면과 실제 화면이 같은 상자(1488×176) · 같은 칸 배치(스크린샷 비교) |
| FR-9 번들 | pass | `/investments` First Load **136 → 136 kB**(페이지 3.42 → 3.55 kB) |
| 금지 문구 | pass | "급등 · 급락" 앱 0건 |

## 2. 게이트

| 게이트 | 결과 |
|---|---|
| `pnpm check-types` · `pnpm lint`(monorepo 6) | pass |
| `pnpm test` | pass — core 11 · ui 43 |
| `build-storybook`(@repo/ui) | pass — `Sparkline` `AreaWithBaseline` 스토리 |
| `web` · `web-tax` 프로덕션 빌드 | pass(worktree) |
| `layer-check` 사후 실행(Bash 로 쓴 17파일) | pass |

## 3. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 태그 · 옅은 칠이 붙은 실화면 | 오늘 기본 종목 중 ±5% 가 없다 | 변동 큰 날 스모크 또는 `MARKET_SUMMARY_WIDE_MOVE_RATE` 를 낮춰 로컬 확인 |
| 로그인 상태 화면 · 관심 종목 탭에서의 WS 갱신 눈 확인 | 로그아웃 상태로만 봤다(코드상 탭과 무관) | PR 스모크 |
| 등락 금액 첫 값(서버 저장 시세) vs WS 값 차이 | 저장 시세가 오래되면 첫 페인트 금액이 다르다(실측 -2,118,000 → -2,125,000) — WS 첫 틱에 맞춰진다 | `SRV-REQ-036` 범위 밖 항목 |
| 사유 태그 · 지수 · 환율 · 일정 | 서버 소스 없음 | REQ 범위 밖 표 |

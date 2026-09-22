# F004 슬라이스 6 — 상세 분석 페이지 · 해설 (FE) — 체크리스트

슬라이스: `requirements/specs/in-progress/F004-fe-detail-page-slice.md` · 2026-09-22
브랜치: `feat/f004-fe-detail-page` (base `main` `3648186`)
영역 체크리스트: `salt-microFe/requirements/reports/checklists/FE-REQ-026.md` · `FE-REQ-028.md` · `FE-REQ-029.md`

## 1. 실측 — 실데이터 (로컬 서버 4000 · BFF 4001 · web dev 3000, 계정 `watchlist-check@local.test`, Playwright)

| 확인 | 결과 |
|---|---|
| BTC 응답 | 두 모드 `insufficient_sample` · zone **`held_rule`**(이 계정은 BTC 보유) |
| `/investments/BTC` 1440 · 375 | Hero(뒤로 · 비트코인 · 현재가 · 변동률 · 별) · 5탭 차트 · 선 3개 + 범례 `예측 아님` · 내 규칙 가격 3행 · 코치 카드 `BlockedNotice` · 수익 플랜 표(상태 "손실 제한선 올리기 검토" · 25/25/50%) |
| 판단 조회 | 페이지당 **1회** · 모드 전환 후 요청 **0건** · URL `?mode=long_term` |
| 해설 요청 | 버튼 전 **0건**. 막힌 모드엔 해설 카드가 **없다**(빈 상자 없음 — 한 번 남아서 고쳤다) |
| 375px | `scrollWidth 375 = clientWidth` · 세로 한 줄(차트 → 코치 카드 → 수익 플랜) |
| 패널 ⑦ | `/investments` 우측 맨 아래 `상세 분석 보기 →` · href `/investments/XRP?mode=scalp` → 장기 전환 후 `?mode=long_term` → 클릭하면 상세 페이지에서 "장기"가 선택된 채 · 뒤로가기 `/investments?mode=long_term` |
| BFF `explain` 실호출 1회 | 토큰 없음 **401** · 토큰 있음 200 3.3s · 키 `modeReasoning · timeframe · keyDrivers · risks · newsSummary · disclaimer · generatedAt · cached` = FE 타입과 같다 |
| 콘솔 | 폰트 404 2건만(`@repo/ui` 토큰 파일의 기존 URL — `/investments` 도 같다) |

## 2. 실측 — 가로채기 (판단이 열린 화면은 실데이터가 없다)

`page.route` 로 `detail` 에 `renderable: true` 모드를, `explain` 에 성공 · 429 · 500 을 넣었다.
**MSW 서비스 워커가 요청을 먼저 받아서 `serviceWorkers: "block"` 이 필요했다** — 그 때문에 개발 오버레이에
"MSW 워커 기동 실패" 1건이 뜬다(테스트 부작용).

| 확인 | 결과 |
|---|---|
| 코치 카드 | 라벨 · 모드 · 유효 기간 · 점수 + "점수는 확률이 아닙니다" · 근거 · 주의할 점 · 적중률 57% · 평균 +3.1% · 최대 낙폭 −11.0% · 표본 · 맞았던 때/틀렸던 때 같은 목록 |
| 해설 성공 | `AI 생성` 배지 + 생성 시각 · 이유 · 핵심 근거 · 주의점 · 뉴스 요약 **5줄**(6줄 보냄 → 5) · 면책 · 같은 카드 안 성적 · 사례. 서버 `timeframe`("25분") **안 그림** |
| 요청 본문 | `koreanName 비트코인` · `tradeValue24h` 시세 목록 값 · evidence 7 · news 3 |
| 429 | "지금 해설 요청이 많습니다…" · 버튼 다시 누를 수 있음 · 오류 화면 0 |
| 500 | `규칙 기반 설명` 배지 + 판단 `headline` · `reasons` · 오류 화면 0 |
| 같은 프레임 3연타 | **처음 3건 → 수정 후 1건**(상태 가드 → ref 가드) |
| 모드 전환 | 해설이 사라지고 장기(막힘)엔 카드 없음 → 단타로 돌아오면 [해설 보기] |
| 진행 중 화면 이탈 · 모드 전환 | 둘 다 `net::ERR_ABORTED` |

## 3. 성능 — 프로덕션 빌드(`next start -p 3100`, worktree), 1440, 10회

| 항목 | 결과 |
|---|---|
| FCP | p50 28 · p95 44ms |
| Hero(종목명) | p50 365 · p95 369ms |
| 차트 | p50 369 · p95 534ms — 예산 600ms 통과 |
| 코치 카드(모드 스위치) | p50 371 · p95 536ms |
| CLS | **0.097 → 0.004** — Hero 가격 줄이 늦게 생겨 아래가 19px 밀리던 것을 자리 잡아 고쳤다 |
| First Load | `/investments` main 135 kB → 136 kB · `/investments/[symbol]` 133 kB |
| 지연 청크(gzip) | 패널 main 46.2 → 51.7 KB(+5.5, barrel 로 상세 컴포넌트가 딸려 온다) · 상세 전용 +9.0 KB — 합 14.5 KB ≤ 25 KB |

## 4. 게이트

| 항목 | 결과 |
|---|---|
| `pnpm check-types` · `pnpm lint` (monorepo 전체, turbo 6 태스크, `--max-warnings 0`) | pass |
| `layer-check` 훅을 변경 파일 전부에 **내용을 실어** 직접 실행 | 차단 0 (처음엔 `content` 없이 돌려 빈 검사였다 — 회고) |
| `pnpm test:layer-check` | 차단 8 · 통과 5 |
| `@repo/ui` `vitest --project unit` | 22/22 |
| `build-storybook` (ui) | pass · `PreviewChart` `WithPriceLines` 색인 |
| `next build` web · web-tax (worktree — 켜진 dev 서버의 `.next` 를 건드리지 않으려고) | pass · `/tax` 102 kB |

## 5. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 판단이 열린 화면 실데이터 | 성적표 표본 0 — 가로채기로만 봤다 | 판단 유형당 표본 20건 |
| **서버 Gemini 호출 중단** | FE → BFF 는 끊기고(실측) BFF → 서버도 끊는다(슬라이스 5). **서버 `explain` 이 신호를 받지 않아 LLM 호출은 끝까지 돈다**(`GeminiCoachExplainer` · 컨트롤러에 abort 없음) | F004 서버 후속 (`salt-server` 명시 필요) |
| 해설 뉴스 5줄 고정 | 서버 프롬프트가 뉴스 개수와 무관하게 5줄을 요구한다 — 1건을 보내도 5줄이 왔다. 지어낸 줄일 수 있다 | F004 서버 후속 |
| 주문 전 체크 · Hero [주문 전 체크] | 서버가 `stopLossRate` · `maxLossOfTotalRate` 를 받지 · 주지 않는다 | F004 서버 후속 |
| 차트 `1주` 탭 | 서버 차트에 `week` 가 없다 | 서버에 `week` 가 생길 때 |
| 수익 플랜 "거래 기록 추가" 진입 | 화면 없음 | F006 |
| 상세 차트 실시간 캔들 | 프리뷰 실시간 훅이 프리뷰 쿼리 키에 묶여 있다 | 필요가 관측되면 |
| 모드 전환 시 시세 표 리렌더 0(FR-71) · 행 선택 → 판단 페인트 p95 | 슬라이스 4 에서 넘겨받았지만 이번에도 안 쟀다(상세 페이지 측정에 집중) | 패널을 다시 만질 때 — React Profiler |
| 서버 컴포넌트 조회(FR-84) | 토큰이 `localStorage` | `FE-REQ-013` |
| `apps/web` 단위 테스트(`zoneToPriceLines` · `buildExplainRequest`) | `apps/web` 에 테스트 러너가 없다 | 러너 도입 시(`FE-REQ-011` 류) |

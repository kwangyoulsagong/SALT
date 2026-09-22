# FE-REQ-035 (F004 CLEANUP) — 검증 체크리스트

- REQ: `salt-microFe/requirements/specs/in-progress/FE-REQ-035-F004-CLEANUP.md`
- 브랜치: `chore/fe-cleanup-apifetch-candletime` (base `main` `b96faa6`) · 검증일: 2026-09-22
- 상태: **구현 완료 · in-progress 유지** — 머지 후 done
- 환경: 로컬 서버 4000 · BFF 4001 · web dev 3000, 계정 `watchlist-check@local.test`. 번들은 **프로덕션 빌드**(git worktree 두 개)

## 1. 요구사항

| FR | 판정 | 위치 · 근거 |
|---|---|---|
| FR-1 `marketApi` → `apiFetch` | pass | `entities/market/api/marketApi.ts` — `getJson` 하나. 실측 overview · watchlist · chart · intelligence · news 전부 200 |
| FR-2 토글 → `apiFetch` | pass | `features/toggle-watchlist/api/toggleWatchlistApi.ts`. 실측 `POST 201`(`content-type: application/json`, 본문 `{"assetType":"crypto","symbol":"XRP",…}`) → `DELETE 204`, 별 `false → true → false` |
| FR-3 lint 금지 | pass | `apps/web/.eslintrc.json`. 탐침 파일에 `import axios` → `no-restricted-imports` error |
| FR-4 의존성 제거 | pass | `apps/web/package.json` · lockfile 에서 제거, `grep` import 0건 |
| FR-5 `@repo/core/market` | pass | `packages/core/src/market/candleTime.ts`. 사용처 `MarketDetailChart` · `useMarketPreviewChartRealtime` |
| FR-6 러너 | pass | `@repo/core` vitest 4.0.9 · `turbo test` · 루트 `pnpm test` → core 11 · ui 43 통과 |
| FR-7 단위 테스트 | pass | 11건. `TZ=America/New_York` 에서도 통과. **KST 고정을 빼면 4건 실패**(뮤테이션 확인) |
| FR-8 규칙 | pass | `canvas.md` · `ssr.md` · `performance.md` · `api-convention.md` · `streaming-ssr.md` · `performance-frontend.md`. 전부 200줄 이하 |

## 2. 비기능

| 항목 | 결과 |
|---|---|
| First Load JS | 전 · 후 동일 — `/investments` 136 kB · `/investments/[symbol]` 133 kB · `/home` 146 kB · `/tax` 102 kB |
| axios 청크 | 전: `AxiosError` 가 든 지연 청크 1개 **61.8 KB(gzip 21.5 KB)** — 시세 표 · 관심 종목 탭 · 코치 패널 · 상세 분석 위젯이 부른다. 후: **0개** |
| 클라이언트 정적 JS 합계 | 1516 → **1452 KB**(−64 KB) |
| 요청 모양 | 메서드 · 경로 · 상태 코드 전과 같다(위 FR-1 · FR-2) |

First Load 가 그대로인 이유: axios 는 처음부터 지연 청크(`next/dynamic` 잎)에 있었다. 줄어든 것은 `/investments`
진입 직후 받는 두 번째 파도다.

## 3. 게이트

| 게이트 | 결과 |
|---|---|
| `pnpm check-types`(monorepo 6) | pass |
| `pnpm lint`(monorepo 6) | pass |
| `pnpm test` | pass — core 11 · ui 43 |
| `web` · `web-tax` 프로덕션 빌드 | pass(worktree) |
| `layer-check` 사후 실행(Bash 로 쓴 8파일) | pass |
| storybook | 해당 없음 — `@repo/ui` 변경 없음 |

## 4. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 4xx · 5xx 에서 화면 동작(재시도 · 오류 문구) | 실패 계약(던진다)은 같고 에러 모양에 기대는 소비처가 0건(`grep` `isAxiosError` · `.response`)이라 실측하지 않았다 | 슬라이스별 오류 화면을 만질 때 |
| RN 이 `@repo/core/market` 사용 | RN 시세 화면에 실시간 봉이 없다 | RN 시세 실시간 REQ |
| lockfile 의 turbo 2.10 → 2.11 | 루트 `"turbo": "latest"` 가 설치 때 같이 풀렸다. 빌드 · lint · test 는 2.11 로 돌렸다 | 없음 — 기록만 |

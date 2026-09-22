# FE-REQ-036 (F004 ZONE BAND) — 검증 체크리스트

- REQ: `salt-microFe/requirements/specs/in-progress/FE-REQ-036-F004-ZONE-BAND.md`
- 브랜치: `feat/fe-trading-chart-polish` (base `main` `68b1a64`) · 검증일: 2026-09-22
- 상태: **구현 완료 · in-progress 유지** — 머지 후 done
- 환경: 로컬 서버 4000 · BFF 4001 · web dev 3000, 계정 `watchlist-check@local.test`(로그인 상태). 번들은 **프로덕션 빌드**(git worktree 두 개)

## 1. 요구사항

| FR | 판정 | 위치 · 근거 |
|---|---|---|
| FR-1 띠 · `zone` 톤 선 | pass | `TradingChart/engine/drawBase.ts`(띠는 캔들 전) · `PreviewChart.tsx`. 상세 `/investments/XRP` 5분: 2,023 ~ 2,066 띠 · 점선 두 줄 · 중앙 실선 초록 |
| FR-2 이름표 | pass | `관찰 구간 2,023 ~ 2,066 · 예측 아님` — 띠 안 왼쪽 위, 캔들 위(흰 바탕). 문구 `entities/coach/model/messages.ts` `bandLabel` |
| FR-3 패널에도 · 모드 전환 요청 0 · 막혀도 그림 | pass | `CoachPanel` `chartOverlay` → `MarketPreview` → `MarketPreviewChart`. 단타 · 장기 둘 다 `insufficient_sample`(판단 막힘) 상태에서 띠가 그려졌다. 오버레이는 같은 응답을 `useMemo` 로 읽는다(새 조회 없음 — 코드) |
| FR-4 패널 범위 = 캔들만 · ▲▼ | pass (부분) | 장기 모드(1,748.8 ~ 3,121.2)에서 캔들이 납작해지지 않고 띠가 창 전체를 덮는다(실측). **띠가 창 밖에 완전히 나가는 경우**(▲▼ 이름표)는 실데이터로 못 봤다 — 스토리 · 코드만 |
| FR-5 버튼 캡슐 | pass | `TradingChart.css.ts` `controls` · `controlButton`. 테두리 하나 · 구분선 · lucide 아이콘, `aria-label` · `title` · `:focus-visible` |
| FR-6 범례 견본 색 | pass | `CoachDetail.css.ts` `zoneSolid` · `zoneDashed` |
| 금지 문구 | pass | `apps/web` 에서 "매수존 · 바이존 · 매수 적정가 · 목표가" 0건(`grep`) — `FEATURE-004` FR-21. `@repo/ui` **스토리 예시 5곳**에 기존 "목표가 알림" 문구가 있다(아래 §4) |

## 2. 비기능

| 항목 | 결과 |
|---|---|
| First Load JS | 전 · 후 동일 — `/investments` 136 kB · `/investments/[symbol]` 133 kB · `/tax` 102 kB |
| 상세 차트 청크(gzip) | 8,603 → **9,515 B**(+0.9 KB — lucide 아이콘 3 · 띠 · 이름표) |
| 패널 차트 청크(gzip) | 6,226 → **6,630 B**(+0.4 KB) |
| 클라이언트 정적 JS 합계 | 1452 → 1460 KB |
| 콘솔 오류 | 0(상세 · 패널 단타 · 장기) |

## 3. 게이트

| 게이트 | 결과 |
|---|---|
| `pnpm check-types` · `pnpm lint`(monorepo 6) | pass |
| `pnpm test` | pass — core 11 · ui 43 |
| `build-storybook`(@repo/ui) | pass — `WithPriceBand` 스토리 2(TradingChart · PreviewChart) |
| `web` · `web-tax` 프로덕션 빌드 | pass(worktree) |
| `layer-check` 사후 실행 | pass |

## 4. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 띠가 창 밖(▲▼ 이름표) 실데이터 | 오늘 구간이 모두 캔들 범위와 겹쳤다 | 변동이 큰 날 스모크 · 또는 다음 차트 REQ |
| 375px 폭에서 이름표 길이 | 1440 · 패널 폭만 봤다. 이름표가 패널 폭의 약 절반이다 | 모바일 레이아웃 REQ(FEATURE-006 FR-62) |
| 이동평균 · 중앙선이 겹칠 때 가독성 | 색이 다르지만 중앙선 배지가 현재가 배지 아래 깔릴 수 있다(가격이 1원 차이) | 관찰 후 필요하면 |
| `@repo/ui` 스토리의 "목표가" 예시 5곳(Checkbox · TextField · Toggle · Modal · ListRow) | 이 REQ 이전부터 있던 컴포넌트 예시 문구다. 앱 화면에는 없다 | 디자인 시스템 스토리 정리 때 |
| 보유 종목(내 규칙 가격) 화면 | 보유 기록 있는 계정이 없다 — 선만 그리는 기존 경로 그대로 | 보유 데이터가 있는 계정으로 스모크 |

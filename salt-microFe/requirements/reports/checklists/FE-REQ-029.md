# FE-REQ-029 (F004 PERF) — 검증 체크리스트

- REQ: `salt-microFe/requirements/specs/in-progress/FE-REQ-029-F004-PERF.md`
- 브랜치: `feat/f004-fe-coach-panel` · `feat/f004-fe-detail-page`(§2) · 검증일: 2026-09-22
- 상태: **부분 완료** — 패널 · 상세 분석 페이지(FR-70~76 중 일부 · FR-1 · FR-5 · FR-52)
- **전 영역 통합 기록**: 루트 `requirements/reports/checklists/F004-fe-coach-panel.md` · `F004-fe-detail-page.md`

| FR · 예산 | 판정 | 근거 |
|---|---|---|
| FR-70 취소 + 디바운스 | pass · 다르게 구현 | 취소 6~8/11 실측, 디바운스 80ms(기존) |
| FR-71 모드 전환 요청 0 · 표 리렌더 0 | 요청 pass · 리렌더 **미검증** | Profiler 미측정 |
| FR-72 판단만 스켈레톤 · CLS 0 | pass (구조) | 스켈레톤이 실제 블록과 같은 `minHeight`. CLS 수치는 안 쟀다 |
| FR-75 `"use client"` 범위 | pass · 기록 | 모드 스위치 · 모드 훅 · 조회 훅 + 조합 잎 2(`CoachPanel` · `InvestmentsBoard`). 표시 블록(판단 · 구간 · 적중률 줄)은 경계 없음 |
| 패널 · 상세 JS 증가분 ≤ 25KB gzip · 차트 라이브러리 추가 0 | pass | `/investments` First Load 135 → 135 kB(페이지 +0.17 kB). 패널은 lazy chunk, 새 의존성 0 |
| 행 선택 → 판단 페인트 p95 300ms | **미검증** | 표본 측정 안 함 — 상세 페이지 슬라이스 |
| FR-76 관측 | **미충족** | 관측 인프라 미정 |

## 2. 상세 분석 페이지 (슬라이스 6) — 프로덕션 빌드 `next start`, 1440, 10회

| FR · 예산 | 판정 | 근거 |
|---|---|---|
| 상세 첫 페인트 600ms | pass | Hero p95 369 · 차트 p95 534 · 코치 카드 p95 536ms (FCP p95 44ms) |
| FR-72 CLS 0 | pass (0.004) | 처음 **0.097** — Hero 가격 줄이 늦게 생겨 19px 밀렸다. `minHeight` 로 자리를 잡았다 |
| FR-73 오버레이 = 기존 차트 · 라이브러리 추가 0 | pass | `@repo/ui` `PreviewChart` `priceLines` |
| FR-74 Hero · 차트 먼저 · 해설 버튼 전 요청 0 | pass · 기록 | 요청 0 실측. Hero · 차트 · 코치 카드가 같은 청크라 **순서가 아니라 거의 동시**(p50 365 / 369 / 371ms) |
| FR-1 `explain` 자동 호출 0 · FR-5 진행 중 화면 안 멈춤 · FR-52 `aria-busy` | pass | 실측 |
| FR-75 `"use client"` 잎 | pass · 기록 | 새 경계: `SymbolAnalysis`(조합) · `ExplainCard` · `useExplainSymbol` · `MarketDetailChart`(기간 탭) · `InvestmentDetailBody`(dynamic 잎). 코치 카드 · 수익 플랜 · 범례 · 구간 표는 경계 없음 |
| 패널 · 상세 JS 증가분 ≤ 25KB gzip | pass | 패널 지연 청크 46.2 → 51.7 KB(+5.5 — `entities/*` barrel 로 상세 컴포넌트가 딸려 온다) · 상세 전용 +9.0 KB · `/investments` First Load 135 → 136 kB |
| FR-71 모드 전환 표 리렌더 0 · 행 선택 → 판단 페인트 p95 | **미검증** | 이번에도 안 쟀다 — 패널을 다시 만질 때 Profiler |

## 3. 상세 차트 교체 (`FE-REQ-034`, 2026-09-22) — 프로덕션 빌드

| FR · 예산 | 판정 | 근거 |
|---|---|---|
| FR-73 오버레이 = 기존 차트 · 라이브러리 추가 0 | **개정** | 상세 차트는 자체 캔버스 차트(`@repo/ui/tradingChart`). 라이브러리 추가 0, `lightweight-charts` 제거 |
| 상세 첫 페인트 600ms | **미검증** | 응답 → 그리기 p95 40ms(프론트 몫). 서버 차트 응답이 0.02~2.9초로 요동쳐 전체는 예산을 넘는 회차가 있다 — `checklists/FE-REQ-034.md` §5 |
| 패널 · 상세 JS 증가분 ≤ 25KB | pass | 상세 전용 16.8 KB(슬라이스 6 대비 +7.8) · 패널 +0.5 KB |
| CLS | pass | 0.001 |


## 2026-09-23 — 슬라이스 15 후속: 첫 로드 (`next build`, worktree)

| 경로 | 전 | 후 | 판정 |
|---|---|---|---|
| `/investments/[symbol]` | 134 kB | **113 kB** | pass — 목 제거(−24) · SEO 머리 서버 렌더(+3). 중간 회귀 161 kB(+51, 예산 +40 초과)를 머리 서버 컴포넌트 · 배럴 규칙으로 닫음 |
| `/coach/report` | 134 kB | **109 kB** | pass |
| `/investments` | 140 kB | 140 kB | 변화 없음(행 링크 추가) |
| 차트 기간 칩 | — | — | `FilterTabs` 변형 추가뿐, 새 의존 없음 |

미검증: 이동 · 뒤로 가기 간헐 실패 · 복귀 레이아웃(QA 단계). 첫 페인트 · CLS 수치는 이번에 재지 않았다.

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: FR-41 "서버 컴포넌트 조회" → 클라이언트 조회로 다르게(FE-REQ-027 FR-60 과 같은 이유)

## F004 슬라이스 17 (2026-10-30)

| 항목 | 값 |
|---|---|
| `/coach/report` (같은 날 main 워크트리 빌드 대비) | 1.59 → 1.65 kB · 첫 로드 130 → 130 kB |
| `/coach/signals/[signalType]` (신규) | 1.65 kB · 첫 로드 130 kB — 본문은 리포트와 같은 위젯 청크(추가 요청 0, 리포트에서 오면 캐시) |
| 경계 | `BlockBoundary` 1개 · 최소 높이 320(리포트와 같음) |

## 2026-10-30 — F004 슬라이스 18 설정 화면

| 항목 | 확인 |
|---|---|
| 번들 | `pnpm build` — `/settings` 1.79 kB · 첫 로드 130 kB(리포트와 같음, 증가분 0) |
| 경계 | `BlockBoundary` 1개 · `SETTINGS_PAGE.blockMinHeight` 520 |

미검증 · 범위 밖: 스트리밍 게이트 측정 — 본문이 `ssr:false` 라 서버 스트리밍 블록이 없다(리포트와 같음, `FE-REQ-013` 때 다시)

## 2026-10-30 — F004 슬라이스 19 차트 1주 탭

- `pnpm --filter web build` — `/investments/[symbol]` 3.07 kB · 첫 로드 137 kB(슬라이스 16 `F004-fe-preflight-check` 137 kB 와 같음)
- 첫 로드 차트 요청 `period=minute&unit=5&count=200` 1회(1주는 탭 누를 때만)
- 미검증 · 범위 밖: 없음

## F004 슬라이스 20 (2026-10-30)

| 항목 | 값 |
|---|---|
| `/coach/report` (슬라이스 17 기록 대비) | 1.65 → 1.66 kB · 첫 로드 130 → 130 kB — `Chip` 은 위젯 청크에 이미 있음 |
| 경계 | 무변경(`BlockBoundary` 1개) |

## 2026-11-02 — F008 해설 근거 (출처 칩 링크)

- `pnpm --filter web build` — `/investments/[symbol]` 3.06 kB · 첫 로드 137 kB(슬라이스 19 137 kB 와 같음). 새 의존 0(`formatRelativeTime` 은 기존 `shared/lib`)
- 미검증 · 범위 밖: 없음

## F008 슬라이스 24 국내 증시 일정 (2026-11-02)

- 변경: 번들 — `/investments` 154 kB · `/investments/[symbol]` 137 kB, 직전 기록과 같음(새 코드는 지연 조각) · 새 의존 0
- 검증: `pnpm --filter web build`
- 미검증 · 범위 밖: 없음(슬라이스 2단계는 `FC-REQ-021` · `FE-REQ-046` 표)

## 국내 탭 요약 띠 (F011, 2026-11-02)

- 변경: 번들 `/investments` 154 kB · 상세 137 kB 그대로 · 새 의존 0
- 검증: `pnpm --filter web build`
- 미검증 · 범위 밖: 없음

## 요약 띠 좁은 폭 고침 (2026-11-02)

- 번들 `/investments` 154 kB 그대로 · CSS 만

## 2026-11-02 — MONEY-F1(`FE-REQ-053`) 투자 zone 분리 · 홈 카드

- MONEY-F1(`FE-REQ-053`) 에서 이 REQ 가 걸렸다 — shared 레이어 → `@repo/web-shared`(import 경로 치환)(`20971abf`) · 투자 코치 설정 `/settings` → `/coach/settings`(셸 `/settings` 는 링크 목록)(`08a3aabf`) · 투자 화면 `apps/web/src` → `packages/domain-invest/src`(내용 무변경) · 투자 zone 조립(`b00b0cea`). 파일 3개(경로 이동 내용 무변경 1 · 수정 2 · 추가 0 · 삭제 0). 화면 · 동작이 바뀐 몫은 위 커밋 설명대로
- 확인: 모노레포 check-types · lint · test · zone 5 빌드 · layer-check · 훅 사후 실행(바뀐 TS 전부) · 실화면 — `salt-microFe/requirements/reports/checklists/FE-REQ-053.md` §2

- 2026-11-02 MONEY-F1 최종 HEAD 번들(위 스펙 Changelog 행) — main 워크트리 빌드 대조

## 2026-11-03 — MONEY-F2(`FE-REQ-054`) 앱 내비게이션

- 번들(PERF) — 투자 zone 화면에 앱 내비게이션. Next 표: `/investments` 159 → 139 · `/investments/[symbol]` 138 · `/coach/report` 135 · `/search` 157(main 대조). **HTML 이 싣는 JS gzip**: `/investments` 193.1 → 196.5(+3.4) · `/coach/report` 189.5 → 192.1(+2.6) · `/search` 205.9 → 209.4(+3.5) KB(최종 HEAD `f6587a53`)(`5a86dafa` · `e0bce695`)
- 확인: 모노레포 check-types · lint · test · zone 5 빌드 · layer-check · 훅 사후 실행 · Storybook · 실화면(5화면 × 5폭 · 앱 웹뷰 · WebKit) — `salt-microFe/requirements/reports/checklists/FE-REQ-054.md` §2

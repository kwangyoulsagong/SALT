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

# FE-REQ-029 (F004 PERF) — 회고

- 날짜: 2026-09-22 · 슬라이스: `F004-fe-coach-panel` · 루트 회고: `requirements/reports/retrospects/F004-fe-coach-panel.md`

## 잘 된 것
- 번들을 전후로 쟀다: `/investments` First Load 135 → 135 kB (페이지 +0.17 kB)
- 취소를 브라우저에서 쟀다: 11회 빠른 선택 중 6~8 `ERR_ABORTED`

## 부채 · 다음 행동
- 행 선택 → 판단 페인트 p95 · 모드 전환 표 리렌더 · CLS 는 안 쟀다 — 상세 페이지 슬라이스에서 Profiler · PerformanceObserver 로
- hover 디바운스 80ms(기존) vs REQ 150ms — 판단 요청 수가 문제로 보이면 코치 쿼리만 따로 늦춘다

## 슬라이스 6 — 상세 분석 (2026-09-22) · 루트 회고: `requirements/reports/retrospects/F004-fe-detail-page.md`

### 잘 된 것
- 첫 페인트를 dev 서버가 아니라 **프로덕션 빌드**로 쟀다(worktree + `next start -p 3100`) — 차트 p95 534ms
- CLS 를 처음으로 숫자로 쟀고 0.097 → 0.004 로 고쳤다. 원인은 layout-shift `sources` 로 특정했다

### 부채 · 다음 행동
- Hero · 차트 · 코치 카드가 한 지연 청크라 "Hero 먼저"(FR-74)가 순서로 성립하지 않는다(거의 동시). 쿠키 인증 후 Hero 를 서버 렌더로
- 패널 청크 +5.5 KB 는 barrel 때문이다 — 더 커지면 상세 전용 컴포넌트를 barrel 밖(직접 경로 import 허용 규칙 필요)으로
- FR-71 · 행 선택 p95 는 두 슬라이스째 이월 — 다음에 패널을 만질 때 먼저 잰다

## 2026-09-23 — 슬라이스 15 후속

- SEO 로 머리를 서버에 올리자 첫 로드가 +51 kB 가 됐다. 머리만 서버 컴포넌트로 바꿔도 그대로였다 — **서버 페이지가 배럴을 import 하는 것만으로** `"use client"` 모듈 전부가 경계가 된다
- 빌드 수치를 커밋 전에 봐서 잡았다. Action: 번들 게이트를 CI 에 두는 일(`performance-frontend.md` 번들 게이트 — 남은 정리)

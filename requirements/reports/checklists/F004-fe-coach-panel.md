# F004 슬라이스 4 — 투자 우측 AI 코치 패널 (FE) — 체크리스트

슬라이스: `requirements/specs/in-progress/F004-fe-coach-panel-slice.md` · 2026-09-22
브랜치: `feat/f004-fe-coach-panel` (base `main` `157c624`)
영역 체크리스트: `salt-microFe/requirements/reports/checklists/FE-REQ-026.md` · `FE-REQ-028.md` · `FE-REQ-029.md` · `bff/…/BFF-REQ-024.md`

## 1. 실측 (로컬 서버 4000 · BFF 4001 · web dev 3000, 계정 `watchlist-check@local.test`, Playwright 1440×900)

| 확인 | 결과 |
|---|---|
| 첫 행(XRP) 패널 | 모드 스위치 · "지금의 판단" · `BlockedNotice`(과거 표본 적음 · 표본 0건 · 정상 동작) · 관찰 구간 3행 + 거리 금액 + 규칙 설명 · `예측 아님` |
| BTC 응답 | 두 모드 `insufficient_sample` · zone `unavailable(insufficient_price_history)` · `gaugeTrackRecords: []` → 게이지 줄 없음 |
| 모드 전환(클릭) | URL `?mode=long_term` · **요청 0건**(RSC 포함) · `aria-checked` 이동 |
| 키보드 ← | `?mode=scalp` · 포커스 "단타" |
| 행 11개 30ms 간격 클릭 | 판단 요청 11 · **취소 6~8** (`net::ERR_ABORTED`, 2회) |
| 375px | `scrollWidth 375 = clientWidth` · 패널이 표 아래 |
| 블록 폭 | 299px → 487px 로 수정(부모 `flex-start`, `alignSelf: stretch`) |
| `/investments` First Load | main 135 kB (페이지 8.28 kB) → 135 kB (8.45 kB) |

## 2. 게이트

| 항목 | 결과 |
|---|---|
| `tsc --noEmit` web · core · ui | pass |
| eslint (변경 슬라이스 · SegmentedControl · core) `--max-warnings 0` | pass (FSD 레이어 규칙 포함) |
| `vitest --project unit src/SegmentedControl` | 5/5 |
| `next build` (web) | pass |

## 3. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| `renderable: true` 판단 화면 | 판단 성적표 표본 0 — 전부 막힘 | 판단 유형당 표본 20건 |
| `held_rule` 구간 · 게이지 한 줄 실데이터 | 이 계정 응답에서 BTC 구간은 `unavailable`, 게이지 표본 없음 | 워커 적재 후 같은 스크립트로 |
| BFF → 서버 upstream 취소 | 브라우저 취소만 봤다. 서버 로그를 보지 않았다 | BFF 슬라이스 4 에서 서버 접근 로그로 |
| 모드 전환 시 시세 표 리렌더 0(FR-71) | 요청 0건만 쟀다. Profiler 미측정 | 상세 페이지 슬라이스에서 React Profiler |
| 행 선택 → 판단 페인트 p95 300ms(FE-REQ-029) | 표본 측정 안 함 | 상세 페이지 슬라이스 |
| ⑦ 상세 분석 버튼(FR-119) | 페이지 없음 | L절 슬라이스 |
| hover 디바운스 150ms(FR-82) | 기존 80ms 유지(입력 예산 100ms, `RealtimeMarketTable`) — 취소가 나머지를 받는다 | 판단 요청 수가 문제로 관측되면 |
| 모바일 접힘 폭 ≤1024px(FR-120) | 기존 767px(FE-REQ-010 FR-52) 유지 | 자산 탭 재편(F006) |
| 쿠키 인증(FR-80) | `localStorage` 토큰 | `FE-REQ-013` |

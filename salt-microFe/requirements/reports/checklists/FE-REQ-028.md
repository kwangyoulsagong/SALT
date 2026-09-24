# FE-REQ-028 (F004 API) — 검증 체크리스트

- REQ: `salt-microFe/requirements/specs/in-progress/FE-REQ-028-F004-API.md`
- 브랜치: `feat/f004-fe-coach-panel` · `feat/f004-fe-detail-page`(§2) · 검증일: 2026-09-22
- 상태: **부분 완료** — 패널 조회 · 상세 조회 · 해설(FR-10~13 · FR-62 · FR-86 · FR-88)
- **전 영역 통합 기록**: 루트 `requirements/reports/checklists/F004-fe-coach-panel.md` · `F004-fe-detail-page.md`

| FR | 판정 | 위치 · 근거 |
|---|---|---|
| FR-3 조회 함수 `entities/coach/api` | pass | `coachApi.symbolDetail` — `apiFetch`(axios 아님) |
| FR-70 · FR-89 뷰모델 타입 `packages/core` · 재정의 0 | pass | `@repo/core/coach`. 앱은 `entities/coach/model/types.ts` 로 re-export 만 |
| FR-72 · FR-89 막힌 분기에서 `judgment` 접근 컴파일 실패 | pass | 판별 union (BFF 원본과 같은 모양) |
| FR-73 열거값 enum | **미충족** | BFF 원본이 리터럴 union — 사본이라 따랐다. 회고 참고 |
| FR-74 `any` 0 | pass | |
| FR-80 패널 조회는 클라이언트 | pass · **다르게 구현** | React Query. 인증은 `localStorage` 토큰(쿠키는 `FE-REQ-013`) |
| FR-81 키 `['coach','symbol',symbol]` · 모드 없음 · `staleTime 30s` | pass | `coachQueryKeys.symbol` |
| FR-82 이전 요청 취소 · hover 150ms | pass · **다르게 구현** | `signal` 전달, 실측 11회 중 6~8 취소. 디바운스는 기존 80ms |
| FR-83 모드 전환 요청 0 | pass | 실측 0건 (`history.replaceState`, REQ 개정) |
| FR-85 URL 에 없으면 `mode` 안 보냄 | pass | **언제나 안 보낸다** — 응답에 두 모드가 다 있다 |
| FR-64 · FR-65 서버 에러 원문 비노출 | pass | 상태 코드만 `CoachApiError` 로, 화면은 고정 문구 |
| 재시도 | — | 5xx · 네트워크 1회, 4xx 0회 |
| FR-1 · FR-2 · FR-14~61 · FR-87 | 미착수 | 리포트 · 재생성 · 피드백 · preflight |

## 2. 상세 분석 · 해설 (슬라이스 6)

| FR | 판정 | 위치 · 근거 |
|---|---|---|
| FR-10 · FR-11 `explain` 버튼으로만 | pass | mutation(`useExplainSymbol`) — 쿼리가 아니다. 실측 버튼 전 0건 |
| FR-12 재시도 0 · `AbortSignal` | pass | `retry: 0` · 언마운트 · 모드 전환 시 abort(실측 `ERR_ABORTED` 2경로) |
| FR-13 20s · `Button loading` | pass | `EXPLAIN_TIMEOUT_MS` — 자체 타이머(`AbortSignal.any` 미사용, Safari 17.4 미만) · `aria-busy` |
| (BFF-REQ-026 FR-6) 디바운스 | pass | **ref 가드** — 상태 가드로는 같은 프레임 3연타가 3건이었다(실측 → 1건) |
| FR-62 실패 · 타임아웃 → 규칙 기반 문장 | pass | 판단 `headline` · `reasons` + `규칙 기반 설명` 배지. 429 는 "잠시 후 다시"로 분리 |
| FR-84 상세는 서버 컴포넌트 1회 조회 | **다르게 구현** | 클라이언트 조회 1회(토큰이 `localStorage`, `FE-REQ-013` 전). 패널과 같은 키라 staleness 가 갈리지 않는다 |
| FR-86 해설 본문에 `mode` · `renderable` union | 부분 | `mode` 를 싣는다. **서버 응답에 `renderable` 이 없다** — 막힌 모드는 버튼을 그리지 않는 것으로 처리 |
| FR-88 관심 추가 = 기존 watchlist mutation | pass | `WatchlistStarButton` 재사용 — 코치 쿼리를 건드리지 않는다 |
| 해설 타입 위치 | 기록 | `features/explain-symbol/model/types.ts` — BFF 가 가공 없이 넘기는 서버 모양이라 `@repo/core` 에 "BFF 사본"으로 둘 원본이 없다 |

## 2026-09-22 — 해설 응답 합 타입 (`feat/server-f004-followup`, F004 슬라이스 10)

| 항목 | 판정 | 근거 |
|---|---|---|
| 해설 응답 `ExplainResult` = 렌더(`renderable:true` + 해설) \| 막힘(`renderable:false` · `blockedReason`) | pass | `features/explain-symbol/model/types.ts`. `useMutation<ExplainResult>` |
| 막힘이면 해설 필드에 접근하지 않는다 | pass | `ExplainCard` 가 `renderable` 로 좁힌 뒤 그린다. 막힘은 안내 한 줄 |
| FR-10~13 · FR-62 회귀 | pass(정적) | 호출 · 재시도 0 · 20s · 규칙 기반 대체 경로는 그대로. `check-types` · `lint` · web · web-tax 빌드 · `pnpm test` 54 |
| 막힘 안내 화면 실측 | **미검증** | 로컬 판단 표본이 없어 버튼이 안 뜬다 — 표본 시드 후 |

## 3. 코치 리포트 · 재생성 (슬라이스 15, 2026-09-23, `feat/fe-f004-coach-report`)

| FR | 판정 | 위치 · 근거 |
|---|---|---|
| FR-1 | **다르게** | 클라이언트 조회(`useCoachReport`) — 토큰이 `localStorage` |
| FR-2 | **미착수** | 성적표 경로 없음 |
| FR-3 · 4 | **pass** | `entities/coach/api` · 한 번 부른다 |
| FR-20 | **pass** | `features/regenerate-coach/api` — mutation · 재시도 0 |
| FR-21~23 | **pass(코드 · 테스트)** | `generation-status` 2초 · 최대 15회 · 중단 4 |
| FR-24 | **pass(코드)** | 429 → 남은 시간 |
| FR-25 | **pass** | React Query `signal` → `coachApi.generationStatus` |
| FR-26 | **pass** | `refetchIntervalInBackground` 기본 false |
| FR-27 | **다르게** | `router.refresh()` 가 아니라 리포트 쿼리 키 무효화(조회가 클라이언트) |
| 실측 | **미검증** | 로그인 상태 202 → 폴링 → 갱신 — 사용자 브라우저 |

## F009 슬라이스 0 — C01 (FR-86a, 2026-09-24)

| FR | 판정 | 근거 |
|---|---|---|
| FR-86a `{ symbol, mode }` | **pass** | `buildExplainRequest(view, mode)` · `ExplainCard` 의 `subject` prop 삭제 · `SymbolAnalysis` 의 시세 목록 → 해설 연결 삭제 |
| 게이트 | **pass** | `pnpm check-types` · `lint` · `test` · `build`(web · web-tax) · `layer-check` 5파일 |

### 미검증

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 인증된 HTTP · 화면에서 해설 실측 | 로그인 토큰을 만들 수 없었다(자동 모드 권한). 유스케이스 · DTO 단위 테스트로만 확인 | 사용자 로그인 화면 QA |
| 사실 스냅샷 ID(화면 상태와 해설 사실을 묶기) | 화면이 보내는 사실이 0 이라 위조 경로는 닫혔다. 남는 것은 "화면의 가격과 해설 시점 가격이 몇 초 다를 수 있음"뿐 — `facts.asOf` 로 드러난다 | 화면에 해설 기준 시각 표시가 필요해지면 |
| 사실의 `metricId` 구조 | 근거가 아직 라벨 + 문자열이다(C03 의 남은 절반) | 도구 호출 에이전트(`FEATURE-008` FR-41 · 44) |

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

## F011 슬라이스 7d · 7e — 국내 미러 · 청산 목록 자산군 (2026-10-26)

- `coachApi.krMirror` · `outcomes(…, assetType)` · 키 두 개 — tsc · eslint 0 · Playwright 에서 `assetType=kr_stock` 요청 확인(고정 응답이 그 URL 로만 국내 청산을 줌)
- 미검증: 없음(BFF 경유 실호출은 상시 BFF 가 없어 `BFF-REQ-040` 미검증 행과 같음)


- 2026-10-26 F011 7f: 국내 복기 엔드포인트 · 쿼리 키 — check-types · build

## 2026-10-28 — F000 웹 API 에러 정규화 (파일만 걸침)

| 항목 | 결과 |
|---|---|
| `useCoachReport · useSymbolCoach · regenerateCoachApi` | 재시도 판정 → `retryWhileRetriable(1)` · `RegenerateCoachApiError` → `ApiError`. 429 쿨다운은 결과로 읽기 그대로 |
| 검증 | check-types · lint · web · web-tax build · layer-check pass. 재시도 실측은 루트 `requirements/reports/checklists/F000-api-error-normalize.md` §2 |

미검증: 없음 — 판단 · 화면 무변경

## 2026-10-29 주석 정정

- 주석만 — `entities/coach/api/endpoints.ts` 리스크 예산 경로 설명 "게이지 3" → "게이지 · 측정"(F010 부터 다섯, F009 슬라이스 9 로 측정 칸 2 추가). 경로 · 코드 무변경. 훅 exit 0 · `web` check-types · lint

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: FR-80 의 "쿠키 세션 · `localStorage` 에 두지 않는다"는 아직 아님 — 토큰은 `localStorage`, 이전 주인은 `FE-REQ-013`

## 2026-10-30 — F004 슬라이스 18 설정 화면

| FR | 구현 | 확인 |
|---|---|---|
| FR-50 | `editCoachProfileApi.save` · `retry: 0` | PATCH 1회 · 실패 시 재시도 0(route 500) |
| FR-51(다르게) | `symbolAll()` · `report()` 무효화 | 실화면 |
| FR-52(개정) | `CoachProfileSettings.defaultMode` · `panicSellWindowHours` | 타입 · 실화면 |

미검증 · 범위 밖: `notificationLevel` 칸(서버 소비처가 생길 때)

## 2026-11-02 — MONEY-F1(`FE-REQ-053`) 투자 zone 분리 · 홈 카드

- MONEY-F1(`FE-REQ-053`) 에서 이 REQ 가 걸렸다 — shared 레이어 → `@repo/web-shared`(import 경로 치환)(`20971abf`) · 투자 화면 `apps/web/src` → `packages/domain-invest/src`(내용 무변경) · 투자 zone 조립(`b00b0cea`) · 조회 훅 렌더 중 `localStorage` 토큰 읽기 → `useHasAccessToken`(`/search` 수화 불일치 수정)(`b4a59677`). 파일 6개(경로 이동 내용 무변경 2 · 수정 4 · 추가 0 · 삭제 0). 화면 · 동작이 바뀐 몫은 위 커밋 설명대로
- 확인: 모노레포 check-types · lint · test · zone 5 빌드 · layer-check · 훅 사후 실행(바뀐 TS 전부) · 실화면 — `salt-microFe/requirements/reports/checklists/FE-REQ-053.md` §2

## 2026-11-04 — `DEV-001` 렌더 중 읽기 lint

- `useRegenerateCoach` 의 `now` 초기값을 렌더 중 `Date.now()` 대신 0 으로 — 쿨다운을 받은 뒤에만 쓰는 값이라 화면은 같다(`DEV-001` `no-render-read`)
- 검증: 프론트 전체 `pnpm lint` 12/12 · 규칙 변이(나쁜 6줄 다 걸림 · 처리기 · 효과 · 일반 함수 통과)


## 2026-11-05 — FE-REQ-013 FR-80 2단계 쿠키 세션

- FR-80 "토큰을 클라이언트 번들 · `localStorage` 에 두지 않는다" 충족(머리 정정 닫힘) — 조회 훅은 `useHasSession` · API 는 헤더 없이(`721063fc`)
- 확인: check-types · lint · test · zone 4 빌드 · 훅 사후 실행 · 실스택 — `salt-microFe/requirements/reports/checklists/FE-REQ-013.md` 2026-11-05


## 2026-11-05 — FE-REQ-013 FR-80 2단계 확인 단계(주석 정정)

- FE-REQ-013 FR-80 2단계 확인 단계: 이 REQ 가 주인인 화면 파일의 낡은 이유 주석("토큰이 `localStorage` 라 클라이언트")에 정정 문장(`95829941`, 주석만 · 동작 0). 서버 조회 이관은 `FE-REQ-013` FR-81(국내 주식은 약관상 대상 아님). 루트 `requirements/specs/done/F000-cookie-session-slice.md`
- 확인: lint · check-types(web · domain-invest) · 훅 사후 실행 · 실화면(해당 화면 200 · 401 미해결 0 · 수화 오류 0)

## 2026-11-10 — F018 걸침

  - `salt-microFe/packages/domain-invest/src/entities/coach/api/endpoints.ts` — "국내 소유자 전용" 주석 정정(`ADR-011`)

검증은 F018 체크리스트(`SRV-REQ-056` · `BFF-REQ-055` · `FE-REQ-070` · 루트 `requirements/reports/checklists/F018-public-market-guest.md`) — 이 REQ 의 기존 확인 항목은 다시 열지 않음(동작이 바뀐 것은 국내 소유자 판정 · 로그인 조건뿐)


## F017 v2 단계 1 — 판단 막지 않음 (2026-11-10, `feat/f017-s1a-judgment-caveats`)

| 항목 | 결과 | 근거 |
|---|---|---|
| FR-89 뒤집힘 — `ModeCoachViewModel` 한 모양 | 충족 | `pnpm check-types` 13/13 · `lint` 13/13 · `test`(core 295 · ui 63) · 투자 zone 운영 빌드(worktree, `/investments/[symbol]` First Load 153 kB) · 레이어 훅 사후(음성 대조 exit 2) |

| 미충족 · 미검증 | 사유 | 언제 닫히나 |
|---|---|---|
| 3종 결함 ~~160~~ → **6**(1b 2026-11-10 — 코인 · 국내 단타 과거 검산 `signal-skill@1` `f38ca6ae` · 국내 단타 원장 `326a0553`, 서버 150요청 · 300모드 실측). 남은 6 = 코인 장기 피하기 — 과거 검산 판단 날 8 < 등록 10(본 기간 뒤 9-29 ~ 만기가 온 판단만) | 규칙을 고른 기간(2018 ~ 2026-09)은 등록상 화면에 못 쓴다 — 날이 쌓이길 기다림(숨기지 않고 결함 꼬리표) | 판단 날 ≥ 10 이 차면 `npm run judgments:signal-skill -- --write` 재실행 — 코인 장기 격자상 11월 중 |

## F017 v2 단계 2 점검 (2026-11-11, `feat/f017-s2-checks-plain-line`)

| 항목 | 상태 | 근거 |
|---|---|---|
| 이 REQ 에 닿은 변경 | 충족 | `entities/coach/api` 에 엔드포인트 `tradeCheck` · 쿼리 키 `tradeCheck(symbol, side)` · `coachApi.tradeCheck` · 훅 `useTradeCheck`(staleTime 60초). 기존 API 무변경 · `pnpm check-types` · `pnpm lint` · `pnpm test`(core 298 · ui 63) · `pnpm test:layer-check` · 실화면(패널 · 코인 상세 · 국내 상세 · 390 웹뷰 · 로딩 · 실패) · 운영 빌드 첫 로드 증가 0 |

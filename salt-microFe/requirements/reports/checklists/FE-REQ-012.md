# FE-REQ-012 (F000 API) — 검증 체크리스트

- REQ: `requirements/specs/in-progress/FE-REQ-012-F000-API.md`
- 브랜치: `fix/fe-home-render-crash`(#40) · `feat/f000-watchlist-tab`(#41) · `feat/f000-invite-onboarding-slice`(#42) ·
  `feat/f000-realtime-reliability`(#43)
- 검증일: 2026-09-18 ~ 2026-09-21 (근거 기록) · 이 문서는 2026-09-22 머지 후 백필
- 상태: **부분 완료** — `period` 정정 · WS 절 · 신규 연결(클라이언트 조회)이 닫혔다. 서버 컴포넌트 조회 ·
  에러 정규화 · 타입 공유 · 동면 호출 제거 · 2026-09-21 추가분이 남았다
- **전 영역 통합 기록**: 루트 `requirements/reports/checklists/F000-watchlist-tab.md` ·
  `F000-invite-onboarding.md` · `F000-realtime-reliability.md`

코드 위치는 `apps/web/src` 기준이다. "코드" 표시는 실행 실측 없이 코드로만 확인한 것이다.

## A. `period` 정정 (FR-1~4)

| FR | 판정 | 근거 · 위치 |
|---|---|---|
| FR-1 `miniute` → `minute` | **pass** | `545bda4`. 서버 · BFF `miniute` 422 · `minute` 200 |
| FR-2 유효값을 `shared/config` enum 으로 | **미충족** | `entities/market/api/endpoints.ts` 의 `CHART_PERIOD_MINUTE` 상수 하나. `week` · `month` 는 서버에 없어 만들지 않았다(`545bda4` 본문) |
| FR-3 프론트가 먼저 배포 | **다르게** | 세 영역이 한 커밋(`545bda4`)에 들어갔다. 순서는 본문에 적었다("프론트가 먼저 · 롤백은 서버부터"). 배포 환경이 없어 순서 자체는 검증 불가 |
| FR-4 `grep -rn "miniute"` = 0 | **미충족** | 1건 — 수정 경위 주석(`endpoints.ts`). 루트 watchlist §7 "유지" |

## B. 동면 호출 제거 (FR-10~13)

| FR | 판정 | 근거 · 위치 |
|---|---|---|
| FR-10 동면 호출 · 훅 · 쿼리 키 제거 | 미착수 | 2026-09-22 grep 으로 앱 코드 호출 0건. MSW `rankingHandlers` 등록은 남아 있다(`app/mock/handlers`) |
| FR-11 `register` · `password` · `account` 호출 제거 | **pass** | 호출 코드 grep 0. BFF proxy 제거(`a4f9cee`) · `/signup` `PUBLIC_PATHS` 제거(`bfe19ba`). 루트 invite §1 #1 · 2 |
| FR-12 410 1주 검증 | 미착수 | BFF 410 이 없다 |
| FR-13 `queryKeys.ts` 정리 | 미착수 | FR-10 과 같이 |

## C. WebSocket (FR-20~26)

| FR | 판정 | 근거 · 위치 |
|---|---|---|
| FR-20 클라이언트에서만 구독 | **pass (코드)** | `wsClient` 가 첫 구독 때 연결한다(`a76cec1`). SSR 에서 WS 를 열던 사고를 막았다고는 **주장하지 않는다** — 수정 전 재현 못 함(루트 realtime §5) |
| FR-21 `limit=100` 유지 | **pass** | 건드리지 않았다 |
| FR-22 `useThrottle` | 미착수 | 수신은 이미 rAF 로 묶인다. 필요성 판정이 남았다(REQ changelog). BFF 쪽은 불필요 판정(`BFF-REQ-010` FR-11) |
| FR-23 마지막 수신 시각 저장 | **다르게** | `wsClient.getLastMessageAt()` (`FE-REQ-011` FR-10 과 같은 판단) |
| FR-24 언마운트 시 해제 · 유령 구독 0 | **pass** | 참조 카운트 구독. 탭 전환 시 `unsubscribe`(100종목) + `unsubscribe_candle` 전송 (Playwright) |
| FR-25 재연결 + 끊김 표시 | **pass** | 3s → 30s 백오프. "연결 끊김 · 재연결 중" → 재기동 뒤 3초 119건 |
| FR-26 캔들 반영 유지 | **pass (육안)** | 차트 갱신 유지. 자동 테스트 없음 |

## D. 신규 연결 (FR-30~36)

| FR | 판정 | 근거 · 위치 |
|---|---|---|
| FR-30 뉴스 훅 `entities/news/api/` · 종목 전환 재조회 | **다르게** | `entities/market/api/useMarketQueries.ts` — `news` 슬라이스가 없다. 쿼리 키에 `symbol` 이 있어 전환 시 재조회(`bde1c81`) |
| FR-31 관심 종목 조회 서버 컴포넌트 · 추가/제거 mutation | **미충족** | mutation 은 `features/toggle-watchlist`. **조회는 클라이언트** — 토큰이 `localStorage` 라 서버가 못 읽는다 |
| FR-32 `portfolio/summary` 서버 컴포넌트 | **미충족** | `entities/portfolio/api/usePortfolioQueries.ts`(`"use client"`). 같은 이유 |
| FR-33 `onboarding/status` 서버 컴포넌트 · 미완료면 온보딩 렌더 | **미충족** | 클라이언트 조회(`useOnboardingStatus`). 홈 대신 온보딩이 아니라 **홈에 카드 1개**(`FE-REQ-010` FR-25 쪽 규칙을 따랐다) |
| FR-34 `invite/check` 디바운스 300ms | **다르게** | 400ms + 6자 게이트 |
| FR-35 `invite/accept` 재시도 0 | **pass (코드)** | mutation 에 `retry` 설정 없음(TanStack 기본 0) |
| FR-36 `POST /api/goals` 연결 | **pass** | 제출이 `console.log` 였다 → 서버에 1건 생성 E2E(`b89f40c`) |

## D-2. 2026-09-21 추가 (FR-60~66)

| FR | 판정 | 비고 |
|---|---|---|
| FR-60~66 검색 훅 · 409 정규화 · 무효화 · 뉴스 필드 · 북마크 훅 · 인증 전 호출 금지 · 목표 판별 유니온 | 미착수 | BFF 계약(`BFF-REQ-008` 신규 3)이 선행 |

## E. 에러 처리 · 문구 분리 (FR-40~44)

| FR | 판정 | 근거 · 위치 |
|---|---|---|
| FR-40 에러 문구를 `shared/i18n` 으로 | 미착수 | `packages/core/src/http/constants.ts` 에 있고 `shared/i18n` 은 재수출만 한다 |
| FR-41 `shared/api` 에러 정규화 `{status, code, retriable}` | 미착수 | `apiFetch` 는 MSW 게이트만 한다(`3a736de`). 주석이 "이 함수 위에 붙는다"로 자리만 표시 |
| FR-42 `shared/api` 가 문장을 만들지 않는다 | 미착수 | FR-41 과 같이 |
| FR-43 410 개발 콘솔 경고 | 미착수 | |
| FR-44 서버 에러 원문 미노출 | 미착수 | 초대 경로만 `reasonCode` → 문구. 전 경로 확인 안 함 |

## F. 타입 (FR-50~53)

| FR | 판정 | 근거 · 위치 |
|---|---|---|
| FR-50 뷰모델 타입 `packages/core` | **미충족** | 프론트가 `entities/*/model/types.ts` 에 다시 선언한다. `bff` 가 workspace 밖(`BFF-REQ-008` FR-13). 합치는 주인은 이 REQ(2026-10-29 정정 — 전엔 `FE-REQ-024`) |
| FR-51 `period` · `assetType` · `alertKind` · `newsSentiment` enum | **미충족** | `MarketPeriod` · `WatchlistAssetType` 은 enum. 차트 `period` 는 문자열 상수, `alertKind` · `newsSentiment` 없음 |
| FR-52 `any` 0건 | **pass** | 2026-09-22 `apps/web/src` grep 0 |
| FR-53 WS 메시지 타입 `packages/core` | **미충족** | `shared/api/websocket/types.ts`. `a76cec1` 이 BFF 메시지 5종을 enum 에 더했다 |

## 명령

루트 체크리스트의 게이트 — `check-types` · `lint`(`--max-warnings 0`) · `build` pass(#40~#43).
**웹에 테스트 러너가 없다.**

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| FR-31~33 서버 컴포넌트 조회 | 토큰이 `localStorage` 다 | `FE-REQ-013`(쿠키) |
| FR-50 · 53 타입 공유 | `bff` workspace 밖 | 이 REQ FR-50(2026-10-29 정정 — 전엔 `FE-REQ-024`) |
| FR-10~13 동면 · 410 | BFF 410 선행 | `BFF-REQ-007` A절 |
| `wsClient` 자동 테스트 · 375/390 끊김 문구 | 러너 없음 · 1440 만 봄 | `FE-REQ-013` · 다음 투자 화면 작업 |

## 2026-09-23 — MSW 목 전부 제거 · 목표 조회 실경로 · 공개 시세 서버 조회 (`feat/fe-f004-coach-report`)

루트: `requirements/reports/checklists/F004-fe-coach-report.md` §후속

| 항목 | 판정 | 근거 |
|---|---|---|
| 목표 요약 `GET /api/goals/statistics` · 목록 `GET /api/goals`(BFF 프록시, 인증) | **pass** | `entities/goal/api/goalApi.ts` — 서버 모양을 화면 계약으로 옮긴다. 서버에 없는 D-Day · 달성률 · 썸네일은 `null`(지어내지 않음) |
| 지출 분석 `/api/v1/investments/preview` | **삭제** | 서버 · BFF 에 지출 데이터가 없다 — 목만 받던 경로. 실패 시 보유 목록까지 가리던 구조도 풀림 |
| 목 핸들러 · 워커 · 게이트 · `packages/mocks` · `msw` | **삭제** | 부르는 곳 0(랭킹 · 오픈뱅킹 5개는 원래 0). `apiFetch` 는 맨 `fetch` + 토큰 갱신 |
| 공개 시세 서버 조회(SEO) | **pass** | `pages/investment-detail/api/publicMarketApi.ts` — 토큰 없음 · `revalidate` 30s(종목) · 1h(sitemap) |
| 실측 | dev 6개 화면 200 · 서비스 워커 0 · 페이지 오류 0, 로그인 홈(실제 응답 모양 고정 데이터) 수화 경고 0 |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 실제 로그인 계정으로 목표 · 보유 실측 | 테스트 계정 비밀번호가 기록에 없다(의도) · Chrome 확장 미연결 | QA 단계 |
| 목표 D-Day · 달성률 | 서버 통계에 없다 | 서버가 주면(`GET /api/goals/:id/progress` 합산은 프론트 계산이라 하지 않음) |

## F011 슬라이스 6 — 국내 지수 · 투자자 순매수 (2026-10-26, 파일만 걸침)

| 항목 | 결과 |
|---|---|
| 호출 계약 | `/api/app/market/kr/indices` · `/:code/investors?days=10` 추가, 기존 호출 무변경. 실경로 BFF 4101 200 · 비소유자 404 |

미검증: 없음

## F011 슬라이스 6b (2026-10-27) — 파일만 걸침

엔드포인트 `krOrderbook` 추가 · 국내 시세 응답 `afterHours` 추가만. 기존 호출 무변경. 미검증: 없음

## 2026-10-28 — 에러 정규화 · `period` enum (`feat/fe-req-012-error-normalize`)

루트: `requirements/reports/checklists/F000-api-error-normalize.md`

| FR | 판정 | 근거 · 위치 |
|---|---|---|
| FR-2 `period` enum | **pass (개정)** | `ChartPeriod`(`minute` · `day`) — `entities/market/model/types.ts`. `chartTimeframes` · `endpoints` · `MarketDetailChart` 가 쓴다. 리터럴 0건 |
| FR-4 `miniute` grep 0 | **미충족(유지)** | 경위 주석 1건(`endpoints.ts`) — 위 판단 그대로 |
| FR-40 문구 `shared/i18n` | **pass (개정)** | `@repo/core/http` 재수출로 갈음 — RN 이 같은 값을 본다 |
| FR-41 `{ status, code, retriable }` | **pass** | `shared/api/apiError.ts`. 9개 클래스(`CoachApiError` · `MarketApiError` · `GoalApiError` · `StreamHttpError` · `SignInError` · `RecordTransactionApiError` · `RegenerateCoachApiError` · `SetRiskBudgetApiError` · `ConfirmOutcomeTagsApiError`) 삭제 · grep 0 |
| FR-42 `shared/api` 가 문장을 만들지 않는다 | **pass** | `ApiError.message` 는 로그용 `"<이름> <status> <code>"` — 화면에 안 나간다 |
| FR-43 410 개발 경고 | **pass** | `apiFetch` `warnIfGone` — Playwright 410 고정 응답에서 콘솔 1건 |
| FR-44 서버 원문 미노출 | **pass (코드)** | 앱 전체 `error.message` grep 0. 문구는 `code`(로그인 · 거래 기록) · `reasonCode`(초대) · `status`(404 · 429)로만 |
| FR-51 enum | **부분** | `period` 완료 · `alertKind` · `newsSentiment` 소비처 없음 |
| 재시도 실측 | **pass** | 상세 차트 404 · 422 요청 4 → 2(dev 이중 마운트), 마지막 4.2 → 1.0s · 500 백오프 유지 — 루트 §2 |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| ~~로그인 · 거래 기록 오류 문구 실화면~~ | 같은 날 닫힘 — 아래 후속 절 | 2026-10-28 |
| ~~`ApiError` 단위 테스트~~ | 같은 날 닫힘 — `@repo/core` 17건 | 2026-10-28 |
| `alertKind` · `newsSentiment` enum | 소비처 없음 | F006 `FE-REQ-030` · D-2절 |
| ~~운영 빌드 재시도 실측~~ | 같은 날 닫힘 — 로컬 `next start` | 2026-10-28 |

## 2026-10-28 후속 — 미검증 닫기 (사용자 "다 검증하고 ㄱㄱ")

| 항목 | 결과 |
|---|---|
| ~~`ApiError` 단위 테스트~~ | **pass** — `packages/core/src/http/apiError.test.ts` 17건(봉투 `code` 만 · `message` 미적재 · JSON 아닌 본문 · status 10종 `retriable` · `TypeError` · 횟수 · 헬퍼). 웹 `shared/api` 는 재수출 |
| ~~운영 빌드 재시도~~ | **pass** — `next start -p 3100`: 404 · 422 요청 **1** · 500 요청 3(316 · 1321 · 3325ms) · 410 경고 0(운영은 찍지 않음 — 설계대로) |
| ~~로그인 · 거래 기록 오류 문구 실화면~~ | **pass** — 로그인: 실 BFF → 서버 틀린 비밀번호 "이메일 또는 비밀번호가 맞지 않습니다." · 500 "로그인하지 못했습니다." · 연결 실패 "연결이 닿지 않았습니다." 각 요청 1. 거래 기록(인증 요청만 고정 응답): 409 `PORTFOLIO_INSUFFICIENT_QUANTITY` · 400 `KR_STOCK_NOT_AVAILABLE` · 500 각 문구, 요청 1. 6건 모두 서버 문장 화면 노출 0 |
| ~~서버 모르는 코인 차트 500~~ | 404 (`f74c34f`) — `SRV-REQ-009` |
| ~~BFF 422 · `AppError` code 없음~~ | `3f38160` — `BFF-REQ-025` |
| `alertKind` · `newsSentiment` enum | 남음 — 소비처 없음(F006 `FE-REQ-030` · D-2절) |

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: "현재 `constants/api.ts`"는 없다(위와 같음) / 규칙 `event-bus.md` 는 없다 · `PreviewChart` 는 SVG — "언마운트 때 `remove()`" 대신 구독 · 리스너 해제 / 뷰모델 한 벌화(FR-50)는 이 REQ 가 주인 — 다른 문서 · 코드 주석이 `FE-REQ-024` 로 가리키던 것을 2026-10-29 바로잡았다
- 2026-10-29: 코드 주석 3곳(`entities/auth` · `entities/market` `model/types.ts`)의 한 벌화 주인을 이 REQ FR-50 으로 · 훅 exit 0 · `web` check-types · lint

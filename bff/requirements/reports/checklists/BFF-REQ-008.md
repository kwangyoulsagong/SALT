# BFF-REQ-008 (F000 API) — 검증 체크리스트

- REQ: `requirements/specs/in-progress/BFF-REQ-008-F000-API.md`
- 브랜치: `feat/f000-watchlist-tab` → `feat/f000-invite-onboarding-slice` · 검증일: 2026-09-18
- 상태: **부분 완료** — 신규 7계약 · 제거 목록 · **동면 410(FR-11, 2026-09-22)** 이 닫혔다. 남은 것은 FR-13(`packages/core` 공유)
- **전 영역 통합 기록**: 루트 `requirements/reports/checklists/F000-watchlist-tab.md`

## 1. 신규 계약

| Method | Path | 상태 | 실측 |
|---|---|---|---|
| GET | `/api/app/watchlist` | **열림** | 0건 `{items:[]}` · 크립토 실가격 `priceStale:false` · 주식 `null`+`true` · 토큰 없음 401 |
| POST | `/api/app/watchlist` | **열림** | 201 · 중복은 **서버 409 와 메시지를 보존** |
| DELETE | `/api/app/watchlist/:id` | **열림** | 204 |
| GET | `/api/app/news` | **열림** | 실기사 · `symbol` 누락 400 |
| GET | `/api/app/portfolio/summary` | **열림** | 이름 부착 · 합계 · `namesDegraded` |
| GET | `/api/app/onboarding/invite/check` | **열림** (2026-09-18) | 아래 "온보딩 3계약" |
| POST | `/api/app/onboarding/invite` | **열림** (2026-09-18) | 동일 |
| GET | `/api/app/onboarding/status` | **열림** (2026-09-18) | 동일 |

제거 목록(`/api/auth/register` 등)은 초대 경로가 생긴 뒤 지웠다(2026-09-18) — 먼저 지우면 로그인
경로가 빈다. 동면 경로 410 은 §5(2026-09-22).

## 2. 뷰모델

| 타입 | 비고 |
|---|---|
| `WatchlistItemVM` | `priceChange24h` → `changeRate` 로 이름을 옮기고 신선도를 `priceStale` 불리언 하나로 접는다 |
| `NewsPreviewVM` | **`content` 를 담지 않는다.** `viewCount` 는 서버가 줄 때만 키를 만든다 |
| `PortfolioSummaryVM` | `namesDegraded` 를 **더했다** — 종목명 조회가 실패해도 금액은 내려보내고, 화면이 "이름이 심볼인 이유"를 알아야 한다 |

프론트는 같은 모양을 `entities/*/model/types.ts` 에 다시 선언한다. `bff` 가 pnpm workspace
밖이라 `@repo/core` 를 import 할 수 없기 때문이고, 합치는 것은 `FE-REQ-024` 다.

## 3. 판단이 REQ와 다른 것

**`GET /api/app/news` 를 인증 없이 열었다** (표는 Auth Y). 서버 `/news` 가 공개 경로이고
같은 프리뷰 패널의 차트·심리도 공개다 — 뉴스만 막으면 로그인 전 화면에서 그 블록만 빈다.
서버가 뉴스를 비공개로 바꾸면 여기도 같이 닫는다.

## 4. 명령

`npm run build` pass · `npm test` 23건 pass (뷰모델 매핑 17 + 관심 목록 판정 6).

## 온보딩 3계약 (2026-09-18, `feat/f000-invite-onboarding-slice`)

| 경로 | Auth | 결과 |
|---|---|---|
| `GET /api/app/onboarding/invite/check?code=` | N + rate limit | `{valid}` / `{valid:false, reasonCode}` |
| `POST /api/app/onboarding/invite` | N + rate limit | `201 {accessToken, refreshToken, user}` / `403 {reasonCode}` |
| `GET /api/app/onboarding/status` | Y | `OnboardingStatusViewModel` · 무인증 401 |

| FR | 내용 | 결과 |
|---|---|---|
| FR-9 | 초대 실패가 `403` + `reasonCode`, 문구는 프론트 | **pass** |
| FR-10 | `invite/check` 가 상한 초과를 노출하지 않는다 | **pass** — 서버가 지우고 **BFF 가 한 번 더 지운다** |
| FR-13 | 뷰모델 타입을 `packages/core` 로 공유 | **미충족** — `bff` 는 workspace 밖이라 import 할 수 없다. 프론트가 같은 모양을 선언한다(`FE-REQ-024`) |

**제거 목록**(`/api/auth/register` · `/users/password` · `/users/account`)도 함께 닫혔다.
동면 경로 410(FR-11)은 §5 에서 닫혔다.

## 뷰모델을 정규화한 이유

`nextStep` 을 서버 값 그대로 쓰지 않고 **우리가 정규화한 `steps` 에서 다시 찾는다.**
둘이 어긋나면 화면이 "이미 끝낸 단계로 가라"고 말하게 되고 사용자는 같은 화면을
반복해서 본다. 빠진 단계는 미완료로 채워 `ProgressStepper` 가 항상 세 칸이 되게 했다 —
서버가 한 칸을 빼먹었다고 스텝이 사라지면 사용자가 진행률을 잘못 읽는다.

테스트 5건이 이 규칙을 지킨다(`src/services/__tests__/onboarding.viewmodel.test.ts`).

## 5. FR-11 동면 경로 (2026-09-22, `chore/bff-cleanup` · `BFF-REQ-036`)

| 경로 | 결과 |
|---|---|
| `/api/app/feed` · `/api/missions*` · `/api/users/points/*` · `/api/users/achievements` · `/api/dashboard*` · `/api/users/dashboard` | **410** `{ success:false, code:'ENDPOINT_DORMANT', revivable:true }` — 하위 경로 · 메서드 무관 |
| `/api/users/profile` 등 유지 경로 | 그대로(401/200) |

본문과 FR-1~6 판정은 `BFF-REQ-007.md` §9. **FR-14(유지 경로 하위 호환)**: 같은 PR 에서 5개 컨트롤러가 서버 4xx 를
500 대신 원 status 로 주게 됐다 — 본문 키는 그대로(`BFF-REQ-036` FR-2).

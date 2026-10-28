# SRV-REQ-009 (F000 API) — 검증 체크리스트

- REQ: `requirements/specs/in-progress/SRV-REQ-009-F000-API.md`
- 브랜치: `feat/f000-watchlist-tab` → `feat/f000-invite-onboarding-slice` · 검증일: 2026-09-18
- 상태: **부분 완료** — `portfolio/summary`·`period` 에 이어 **초대 2경로·온보딩 상태·제거 3경로**가 닫혔다. 410 Gone 이 남았다
- **전 영역 통합 기록**: 루트 `requirements/reports/checklists/F000-watchlist-tab.md`

## 1. 신규 엔드포인트

| Method | Path | 상태 | 비고 |
|---|---|---|---|
| GET | `/api/portfolio/summary` | **열림** | `{ items[], totalKrw, fxRateUsed, fxBasisCode }`. 환율 둘은 **언제나 `null`** (`fx` 없음) |
| GET | `/api/news` | 이미 있었다 | 이번에 소비처(BFF `/api/app/news`)가 생겼다 |
| POST | `/api/auth/invite/accept` | 미구현 | `DB-REQ-001` 선행 |
| GET | `/api/auth/invite/check` | 미구현 | 동일 |
| GET | `/api/onboarding/status` | 미구현 | `ledger`·`plan` 공개 API 선행 |

## 2. `period` 계약 정정

| 입력 | 결과 | 비고 |
|---|---|---|
| `period=minute` | **200** | |
| `period` 생략 | **200** (`day`) | 기본값은 유지한다 |
| `period=miniute` | **422** | `MARKET_CHART_PERIOD_UNSUPPORTED`. 조용히 기본값으로 떨어뜨리지 않는다 |

`ErrorKind.Blocked` → 422 매핑을 썼다. 400 으로 두면 필수 필드 누락과 구분되지 않는다.

## 3. 제거·410

`POST /api/auth/register` · `PATCH /api/users/password` · `DELETE /api/users/account` 제거와
동면 경로 410 Gone 은 **하지 않았다.** 초대 경로가 생기기 전에 `register` 를 지우면 계정
생성 수단이 사라진다 — `SRV-REQ-008` FR-1~7 과 같은 릴리스여야 한다.

## 4. 판단이 REQ와 다른 것

**차트 주기를 `minute`·`day` 둘로 정의했다**(`FE-REQ-010` FR-50 은 넷). 거래소 호출도
소비 화면도 없어서 목록에만 넣으면 200 을 기대하게 되고 실제로는 빈 배열이 온다.

## 5. Swagger

`/api/investment/crypto/{symbol}/chart` 에 `period` enum·422 를, `/api/investment/watchlist`
에 응답 스키마(가격이 **number 또는 null**, `logoUrl` nullable)를, `/api/portfolio/summary`
에 전체 스키마를 적었다.

## 6. 명령

`npm run build` pass · `npm test` 162건 pass · `lint` pass · `test:layer-check` pass.

## 7. 초대 · 온보딩 · 제거 (2026-09-18, `feat/f000-invite-onboarding-slice`)

| FR | 내용 | 결과 | 근거 |
|---|---|---|---|
| FR-1 | `POST /api/auth/invite/accept` — 코드 없이 계정 생성 불가 | **pass** | 201 / 403. 코드 없는 경로 자체가 없다 |
| FR-2 | 실패 403 + `reasonCode` 4종 | **pass** | `INVITE_NOT_FOUND`·`INVITE_ALREADY_USED`·`INVITE_EXPIRED`·`INVITE_QUOTA_EXCEEDED` |
| FR-3 | `GET /api/auth/invite/check` 가 유효성만 답한다 | **pass** | 계정 생성 0. 무인증 + rate limit(창당 30) |
| FR-4 | `check` 가 **상한 초과를 노출하지 않는다** | **pass** | 정원 3/3 에서 멀쩡한 코드 → `valid: true`. 판정 순서(코드 먼저)와 `publicRejectionOf` 두 겹 |
| FR-5 | `POST /api/auth/register` 404 | **pass** | |
| FR-6 | `PATCH /api/users/password` · `DELETE /api/users/account` 404 | **pass** | |
| FR-16 (부분) | 제거된 경로의 Swagger 0건 | **pass** | 세 경로의 JSDoc 블록까지 함께 삭제 |
| 신규 | `GET /api/onboarding/status` | **pass** | `{complete, nextStep, steps}` · 무인증 401 |

## 8. 남은 것

| 항목 | 언제 닫히나 |
|---|---|
| ~~동면 5경로 **410 Gone + 1회 로그** (FR-7·8)~~ | **닫힘 2026-10-27** — §9 |
| 410 로그 1주 수집 | 2026-11-03 (머지 · 상시 서버 재시작 뒤 1주) |
| 알림 `kind` 422 (FR-12·13) | `notification` 컨텍스트 |
| 유지 경로 응답 스냅샷 테스트 (FR-23) | 미착수 |

## 9. 동면 410 (2026-10-27, `chore/adr-002-remnants` `d344a50`)

| FR | 내용 | 결과 | 근거 |
|---|---|---|---|
| FR-7 | 동면 경로 **410 + 1회 로그** | **pass** | 워커 없는 스크래치 서버(4100) 실측: `/api/missions`(+ `POST /x/start`) · `/api/users/points/stats` · `/api/users/achievements` · `/api/users/dashboard` · `/api/dashboard` · `/api/feed` · `/api/investment-insight/top` 410. 마운트 지점 7곳 호출 → 로그 7줄(반복 호출은 한 줄) |
| FR-8 | `{ code: 'ENDPOINT_DORMANT', revivable: true }` | **pass** | 위 8경로 본문 |
| — | 유지 경로가 가려지지 않는다 | **pass** | `/api/users/profile` · `/investment-insight/insights` · `/investment-notifications/unread-count` 401(인증으로 그대로) · `/api/nope` 404. 단위 테스트가 목록과 유지 경로 겹침 0을 본다 |
| — | 1주 로그 잔여 0건 | **대기** | 2026-11-03 |

**스펙 표와 다른 것** — `/api/investment-insight/ranking*` 은 없는 경로다. `insight-ranking.controller` 가 거는 `/top` 을 껐다.
`/api/users/dashboard` 를 더했다(BFF 목록과 같다 — 미션 · 포인트 요약).

명령: `npm run build` · `npm run lint` · `npm test` 820 pass(`goneMiddleware.test.ts` 2) · `npm run test:layer-check` · 레이어 훅 사후 실행 4파일 exit 0.
Swagger: 동면 모듈 JSDoc 은 스캔 경로(`src/modules/**/*.routes.ts`)에 그대로 남는다 — 동면은 코드를 지우지 않는다(`SRV-REQ-007`).

## 알림 경로 1종 — FR-12 · 13 (2026-10-28)

루트 `F000-notification-kind-gate` · 브랜치 `feat/f000-notification-kind-gate` · 커밋 `3320883`

| 항목 | 결과 |
|---|---|
| FR-12 생성 422 | 생성은 HTTP 가 아니라 `NotificationApi.publish` — `ErrorKind.Blocked` → 422(단위 · 실 DB). HTTP 생성 경로 0건 |
| FR-13 금액 0 | 실경로 `GET /api/investment-notifications` 항목 `{ id, kind, symbol, messageCode, params, isRead, createdAt }` |
| 경로 4개 | 같은 경로 · 무인증 401 · `size=500` → 400(Zod) · 모두 읽음 · 안 읽은 수 1종만 |
| Swagger | 4경로 `/api/investment-notifications*`(전엔 `/api` 접두 누락) |

미검증: 없음

## 모르는 종목 404 (2026-10-28, `ffc0732`)

확인은 `SRV-REQ-006.md` 같은 날 절(서버 · BFF 실경로 404, BTC 200). 미검증: 없음

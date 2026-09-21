---
id: SRV-REQ-009
feature: F000
area: srv
kind: API
title: "F000 정리·편집 — REST 계약 정의 (인증 축소 · 410 Gone · period 정정)"
priority: high
labels: [api, rest, contract, auth, 410-gone]
created: 2026-09-09
---

## Summary

인증 표면을 줄이고, 동면 경로를 **410 Gone**으로 바꾸고, 차트 `period` 오타를 정정한다. 신규 엔드포인트는 초대 코드와 온보딩 상태 둘뿐이다.

## 신규

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/api/auth/invite/accept` | N | `{ code, email, nickname, password }` | `{ accessToken, refreshToken, user }` / `403 INVITE_*` |
| GET | `/api/auth/invite/check` | N | `?code=` | `{ valid: boolean, reasonCode? }` |
| GET | `/api/onboarding/status` | Y | — | `{ steps: [{ key, done }], nextStep }` |
| GET | `/api/portfolio/summary` | Y | — | `{ items[], totalKrw, fxRateUsed, fxBasisCode }` |
| GET | `/api/news?symbol=&limit=` | Y | — | `{ items[] }` |
| GET | `/api/investment/search?q=&assetType=&limit=20` | Y | — | `{ items: [{ symbol, name, assetType, currentPrice, change24h, isTracked, isHeld }], tracked: { count, limit } }` (2026-09-21, D8) |

> **2026-09-21 — 기존 경로의 계약 추가.** 새 경로가 아니라 **필드 · 상태 코드 추가**다(FR-20 하위 호환).
>
> | Method | Path | 추가 |
> |---|---|---|
> | POST | `/api/investment/watchlist` | 추적 상한 초과 시 **`409 { code: 'TRACKED_ASSET_LIMIT', trackedCount, trackedLimit }`** (D8) |
> | GET | `/api/investment/watchlist` | 응답에 `tracked: { count, limit }` · 항목에 `isHeld` (D8) |
> | GET | `/api/news` · `/api/news/trending` · `/api/news/bookmarks` · `/api/market-intelligence/:symbol/news` | 항목에 `sentiment` · `symbols` 유지, 인증 시 `isBookmarked` (B11 · D5) |
> | POST · GET · DELETE | `/api/news/bookmark` · `/api/news/bookmarks` · `/api/news/bookmark/:newsId` | **이미 있다.** 계약만 문서화한다 — `:newsId` 는 기사 id (D5) |
> | POST · PATCH | `/api/goals` · `/api/goals/:id` | 본문에 `targetQuantity` · `symbol` (택일), 응답에 `goalType` · `currentQuantity?` · `progressRate` (기본안 — 감사 문서 B5) |

## 제거

| Method | Path | 대체 |
|---|---|---|
| POST | `/api/auth/register` | `POST /api/auth/invite/accept` |
| PATCH | `/api/users/password` | 없음 (제거) |
| DELETE | `/api/users/account` | 없음 (제거) |

## 동면 → 410 Gone

| Path | 조치 |
|---|---|
| `/api/missions*` | 등록 해제 → **410 + 1회 로그**, 1주 유지 |
| `/api/users/points/*` · `/api/users/achievements` | 동일 |
| `/api/feed*` | 동일 |
| `/api/dashboard*` | 동일 |
| `/api/investment-insight/ranking*` | 동일 |

## 정정

| Method | Path | 변경 |
|---|---|---|
| GET | `/api/investment/crypto/:symbol/chart` | `period` 유효값을 `minute\|day\|week\|month`로. **`miniute` 거부(422)** |
| GET | `/api/investment/watchlist` | 응답에 현재가·변동률 포함. `AssetType` 3값 |
| GET | `/api/investment/market/overview` | **`limit=100` 유지**(변경 금지 목록) |
| GET | `/api/investment-notifications*` | `kind` **1종**(`signal_update`)으로 제한. 생성 거부, 조회 허용. 개정 2026-09-21 — ADR-002 |

## Requirements

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | `POST /api/auth/invite/accept`가 **코드 없이는 계정을 만들지 않는다** | Must |
| FR-2 | 초대 실패는 `403`이고 `reasonCode` 4종을 구분한다: `INVITE_NOT_FOUND` · `INVITE_ALREADY_USED` · `INVITE_EXPIRED` · `INVITE_QUOTA_EXCEEDED` | Must |
| FR-3 | `GET /api/auth/invite/check`는 **코드 유효성만** 답한다. 계정을 만들지 않는다. 화면이 입력 중 검증에 쓴다 | Must |
| FR-4 | `check`는 **무차별 대입에 대한 정보 노출을 최소화**한다: `valid: false`만 주고 `reasonCode`는 `not_found`/`used`/`expired`까지만(상한 초과는 노출하지 않는다) | Must |
| FR-5 | `POST /api/auth/register` 경로가 **존재하지 않는다**(404) | Must |
| FR-6 | `PATCH /api/users/password` · `DELETE /api/users/account`가 존재하지 않는다 | Must |
| FR-7 | 동면 경로는 **410 Gone + 1회 로그**다. 404가 아니다 — 프론트 잔여 호출을 탐지하기 위함 | Must |
| FR-8 | 410 응답에 `{ code: 'ENDPOINT_DORMANT', revivable: true }`를 담는다 | Should |
| FR-9 | `period=miniute`가 **422**다. 조용히 기본값으로 처리하지 않는다 | Must |
| FR-10 | watchlist 응답에 `currentPrice`·`priceChange24h`·`lastUpdated`를 포함한다 | Must |
| FR-11 | `market/overview`의 `limit=100`·정렬 5·순서 2·기간 7 필터를 **바꾸지 않는다**(변경 금지 목록) | Must |
| FR-12 | 알림 생성 API가 **`signal_update` 외** `kind`를 받으면 **422**다. **개정 2026-09-21** — 2종 → 1종(`tax_deadline` 은 ADR-002 로 소멸) | Must |
| FR-13 | 알림 응답에 **금액이 없다** | Must |
| FR-14 | `portfolio/summary`가 3자산군 원화 합산 + `fxRateUsed` + `fxBasisCode`(`current_rate`)를 준다. **개정 2026-09-21** — 자산군 범위는 열린 질문 Q2 | Must |
| FR-15 | `news`가 실데이터를 주고 없으면 빈 배열이다. **더미 0건** | Must |
| FR-16 | Swagger를 갱신한다. **제거된 경로의 Swagger 문서도 제거**한다 | Must |

### 2026-09-21 추가 — 검색 · 추적 · 뉴스 · 목표 수량

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | `GET /api/investment/search` 를 연다(인증 필수). `q` 는 1자 이상 50자 이하, 없으면 추적 목록을 준다. `limit` 기본 20 · 최대 50. 형식 위반은 **422** (D8) | Must |
| FR-31 | 검색은 **`market/overview` 와 별도 경로**다. overview 에 사용자별 필드를 섞지 않는다 — overview 는 공개 · `limit=100` · 스냅샷 고정(FR-11)이다 (D8) | Must |
| FR-32 | `POST /api/investment/watchlist` 가 추적 상한 초과 시 **409** + `code: 'TRACKED_ASSET_LIMIT'` + `trackedCount` · `trackedLimit` 이다. 이미 관심인 종목 재추가는 기존 동작 그대로(409 가 아니다) (D8) | Must |
| FR-33 | `GET /api/investment/watchlist` 응답에 `tracked: { count, limit }` 를 **추가**한다. 기존 필드는 그대로 (D8) | Must |
| FR-34 | 뉴스 목록 계열 응답 항목에 `sentiment` · `symbols` 가 있다. 인증 시 `isBookmarked` 를 추가하고 무인증이면 생략한다 (기본안 — 감사 문서 B11 · D5) | Must |
| FR-35 | 북마크 3경로의 Swagger 를 현재 동작대로 고친다: `POST /api/news/bookmark { newsId }` → 200(중복은 `Already bookmarked` 200 — **멱등**) · `DELETE /api/news/bookmark/:newsId` → 200 / 없으면 404 · `GET /api/news/bookmarks?page&limit` (D5) | Must |
| FR-36 | 목표 생성 · 수정 본문이 금액 · 수량 택일이다. 위반은 **422** `GOAL_TARGET_INVALID`. 수량 목표에 `POST /goals/:id/savings` 는 **422** `GOAL_QUANTITY_NO_SAVINGS` (기본안 — 감사 문서 B5) | Should |
| FR-37 | 목표 응답에 `goalType` · `progressRate`(서버 계산) · 수량 목표면 `targetQuantity` · `currentQuantity` · `symbol` 을 **추가**한다. 금액 목표 응답은 바이트 단위로 같거나 필드만 늘어난다 (기본안 — 감사 문서 B5) | Should |
| FR-38 | 검색 · 목표 응답에 확신 표현 · 목표주가 · 수익률 예측 필드가 없다(공통 기준 ④) | Must |

## 하위 호환

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 유지 경로의 응답에 **필드 추가는 허용**, 제거·이름 변경은 프론트 동시 변경 | Must |
| FR-21 | `watchlist` 응답 필드 추가는 하위 호환이다 | Must |
| FR-22 | `period` 정정은 **프론트가 먼저** 바뀐 뒤 서버가 오타를 거부한다. 순서를 뒤집으면 차트가 깨진다 | Must |
| FR-23 | 기존 엔드포인트 응답 스냅샷 테스트를 둔다 | Must |

## Acceptance Criteria

- [ ] `POST /api/auth/invite/accept`가 등록되고 코드 없이 계정 생성이 불가하다
- [ ] 초대 실패 `reasonCode` 4종이 구분된다
- [ ] `check`가 상한 초과를 노출하지 않는다
- [ ] `POST /api/auth/register`가 404다
- [ ] `PATCH /api/users/password`·`DELETE /api/users/account`가 404다
- [ ] 동면 경로 5종이 **410 Gone**이고 1회 로그를 남긴다
- [ ] 410 응답에 `code: 'ENDPOINT_DORMANT'`가 있다
- [ ] `period=miniute`가 422다
- [ ] `period=minute`가 200이다
- [ ] watchlist 응답에 현재가·변동률이 있다
- [ ] `market/overview`의 `limit`·필터가 변경 전과 동일하다 (스냅샷 테스트)
- [ ] 알림 생성에 `signal_update` 외 `kind`를 주면 422다 (개정 2026-09-21)
- [ ] 알림 응답에 금액이 0건이다
- [ ] `portfolio/summary`가 3자산군 합산 + 환율 기준을 준다
- [ ] `news`가 실데이터를 주고 더미가 0건이다
- [ ] 제거된 경로의 Swagger 문서가 0건이다
- [ ] 유지 경로 응답 스냅샷이 하위 호환이다
- [ ] 1주 후 410 로그에 잔여 호출이 0건이다

**추가 2026-09-21**

- [ ] `GET /api/investment/search` 가 인증 필수이고 `isTracked` · `isHeld` · `tracked` 를 준다
- [ ] `market/overview` 응답에 사용자별 필드가 0건이다 (스냅샷 불변)
- [ ] 추적 상한 초과 `POST /watchlist` 가 409 `TRACKED_ASSET_LIMIT` 이다
- [ ] 뉴스 목록 · 북마크 목록 항목에 `sentiment` · `symbols` 가 있다
- [ ] 북마크 3경로 Swagger 가 `:newsId` 로 적혀 있다
- [ ] 목표 금액 · 수량 택일 위반이 422 이고 금액 목표 응답이 하위 호환이다

## Dependencies

- **선행:** `SRV-REQ-008`(도메인) · `SRV-REQ-007`(정리) · `DB-REQ-001`
- **순서:** `FE-REQ-012`(F000 API)가 `period` 정정을 먼저 배포 → 서버가 오타 거부
- **소비:** `BFF-REQ-008`(F000 API) · `BFF-REQ-009`(호출 맵 — 2026-09-21 검색 · 북마크 · 목표 행)

## Open Questions

- 초대 수락 시 비밀번호를 받을지 매직링크로 할지. **비밀번호가 기본안**(기존 로그인 경로 유지).
- `check` 엔드포인트를 인증 없이 열면 코드 무차별 대입이 가능하다. **rate limit이 필요**하고, 사용자 ≤10명이면 IP 기준으로 충분하다.
- 410을 1주 후 무엇으로 바꿀지(`SRV-REQ-007` Open Question).

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-18 | **신규 중 `GET /api/portfolio/summary` 를 열고 `period` 정정을 넣었다.** `in-progress` 로 옮겼다. 닫힌 것: `/api/portfolio/summary` · `period` 유효값 검사(모르는 값 **422**, 없으면 `day`). **남은 것**: `/api/auth/invite/check` · `/api/auth/invite/accept` · `/api/onboarding/status` · `/api/news` 계약 정리 · 제거 목록(`register`·`password`·`account`) · 410 Gone. 근거: `requirements/reports/checklists/SRV-REQ-009.md` |
| 2026-09-18 | **초대 2경로·온보딩 상태를 열고 제거 3경로를 닫았다.** 닫힌 것: FR-1~6(`invite/accept` · `invite/check` · `register`·`password`·`account` 404) · FR-16 부분(제거 경로 Swagger 0건) · 신규 `GET /api/onboarding/status`. **남은 것**: 410 Gone(FR-7·8) · 알림 422(FR-12·13) · 응답 스냅샷(FR-23). 근거: `requirements/reports/checklists/SRV-REQ-009.md` §7·§8 |
| 2026-09-21 | **시세 개요의 기간 7 · 순서 2 가 실제로 동작한다.** 서버가 `period` 를 읽지 않아 기간 버튼 7개가 같은 목록을 돌려줬다. `MarketOverviewPeriod` 로 해석하고 항목에 `periodChange`(기준 시세 없으면 `null`)를 **추가**했다(FR-20). 모르는 기간은 422. FR-11 pass — 필터 수·값·`limit=100` 은 그대로다. FR-23 **부분** — overview 한 경로에 필드 계약 테스트. 일봉 백필 스크립트(`candles:backfill`). 근거: `requirements/reports/checklists/F000-market-table.md` |
| 2026-09-21 | **스토리보드 갭 감사 + ADR-002 반영.** 신규 `GET /api/investment/search`(D8). 기존 경로 계약 추가: watchlist `409 TRACKED_ASSET_LIMIT` · `tracked{count,limit}` · 뉴스 `sentiment` · `symbols` · `isBookmarked` · 북마크 3경로 문서화(`:newsId`) · 목표 금액/수량 택일. FR-30~38 추가. 개정: FR-12 알림 2종 → 1종 · FR-14 자산군 Q2. 근거: `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` |

## 구현이 REQ와 다른 지점 (2026-09-18)

**차트 주기를 `minute`·`day` 둘로 정의했다**(`FE-REQ-010` FR-50 은 `week`·`month` 까지
넷을 적었다). 거래소 호출도 소비 화면도 없어서, 목록에만 넣으면 200 을 기대하게 되고
실제로는 빈 배열이 온다. 필요해질 때 `ExchangeQuotePort` 와 함께 늘린다.

`/api/portfolio/summary` 의 `fxRateUsed`·`fxBasisCode` 는 **언제나 `null`** 이다(`fx`
컨텍스트 없음). 필드를 지금 두는 이유는 미국주식이 들어올 때 계약이 바뀌지 않게 하기 위해서다.

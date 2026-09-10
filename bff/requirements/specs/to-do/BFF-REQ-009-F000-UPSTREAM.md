---
id: BFF-REQ-009
feature: F000
area: bff
kind: UPSTREAM
title: "F000 정리·편집 — 서버 호출 계약 정의"
priority: high
labels: [bff, upstream, backend-integration, cleanup]
created: 2026-09-09
---

## Summary

F000에서 BFF가 부르는 서버 엔드포인트. **제거되는 호출**과 **경로가 그대로인 채 컨텍스트만 바뀌는 호출**을 구분하는 것이 핵심이다.

## 호출 맵

| BFF 함수 | 서버 호출 | 타임아웃 | 재시도 |
|---|---|---|---|
| `checkInvite` | `GET /api/auth/invite/check?code` | 300ms | 1회 |
| `acceptInvite` | `POST /api/auth/invite/accept` | 2s | **0회** |
| `login` (proxy) | `POST /api/auth/login` | 2s | 0회 |
| `refresh` (proxy) | `POST /api/auth/refresh` | 1s | 0회 |
| `onboardingStatus` | `GET /api/onboarding/status` | 400ms | 1회 |
| `newsPreview` | `GET /api/news?symbol&limit` | 400ms | 1회 |
| `watchlist` | `GET /api/investment/watchlist` | 400ms | 1회 |
| `addWatchlist` / `removeWatchlist` | `POST/DELETE /api/investment/watchlist` | 600ms | 0회 |
| `portfolioSummary` | `GET /api/portfolio/summary` | 500ms | 1회 |
| `alerts` | `GET /api/investment-notifications` | 400ms | 1회 |
| `marketOverview` | `GET /api/investment/market/overview` | 600ms | 1회 |
| `candles` | `GET /api/investment/crypto/:symbol/chart?period=minute` | 500ms | 1회 |
| `marketIntelligence` | `GET /api/market-intelligence/:symbol/dashboard` | 600ms | 1회 |

## 제거되는 호출

| 제거 | 이유 |
|---|---|
| `GET /api/dashboard` | 동면. 홈 aggregation은 BFF가 담당 |
| `GET /api/investment-insight/top` | 동면 |
| `GET /api/feed` | 동면 |
| `GET /api/missions*` | 동면 |
| `GET /api/users/points/*` · `/achievements` | 동면 |
| `POST /api/auth/register` | 초대 코드로 대체 |
| `PATCH /api/users/password` · `DELETE /api/users/account` | 제거 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 제거 호출 7종이 BFF 코드에 **0건**이다 | Must |
| FR-2 | `app-feed.service.ts`·`app-home.service.ts`에서 동면 호출을 제거한다. **파일은 남긴다**(`app-feed`) | Must |
| FR-3 | mutation(초대 수락·로그인·watchlist 추가/삭제)은 **재시도하지 않는다** | Must |
| FR-4 | 서버 에러 코드를 그대로 전달: `403 INVITE_*` · `422` · `409` · `410` | Must |

## 이관 중 경로 유지 — 서버가 DDD로 바뀐다

`SRV-REQ-010`이 `modules/investment` → `market` 컨텍스트로 옮긴다. **경로는 그대로다.**

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | BFF는 서버 내부 구조를 **모른다.** 경로만 안다 | Must |
| FR-11 | 서버 이관 중 BFF 코드가 **바뀌지 않아야 한다.** 바뀌면 경로가 변경된 것이고 그건 계약 변경이다 | Must |
| FR-12 | 계약 스냅샷 테스트로 이관 전/후 응답이 같음을 확인한다 | Must |

## `period` — 교정하지 않는다

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | BFF는 프론트가 준 `period`를 **그대로 서버에 넘긴다.** `miniute`를 `minute`로 바꾸지 않는다 | Must |
| FR-21 | 서버가 422를 주면 그대로 전달한다 | Must |
| FR-22 | 교정하지 않는 이유: BFF가 오타를 흡수하면 프론트 오타가 영구화되고, 다음 사람이 그 흡수 코드를 발견할 방법이 없다 | Must |

## 가격 캐시 사용

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 관심 종목·포트폴리오 요약의 현재가를 **BFF 가격 캐시**에서 읽는다 | Must |
| FR-31 | 캐시에 없는 심볼로 **서버를 다시 부르지 않는다.** 예산을 넘긴다 | Must |
| FR-32 | 국내·미국 주식은 캐시에 없다(업비트 WS만 구독). **서버 값을 쓰고 `priceStale: true`** | Must |
| FR-33 | 캐시 갱신은 기존 `price-updater.worker`가 담당한다. **서버 `market-price-updater`가 제거되므로 BFF가 단일 경로**가 된다 | Must |

## 계약 의존

| 서버 필드 | 변경 시 영향 |
|---|---|
| `invite/check.valid` · `reasonCode` | 초대 입력 화면 |
| `onboarding/status.steps[]` · `nextStep` | 온보딩 진행 |
| `news.items[].{title,summary,imageUrl,source,publishedAt}` | 뉴스 프리뷰 |
| `watchlist.items[].{currentPrice,priceChange24h}` | 관심 종목 목록 |
| `portfolio/summary.{items,totalKrw,fxRateUsed}` | 홈 "주식" 섹션 |
| `market/overview` **전체** | **변경 금지 목록.** 실시간 테이블 |
| `market-intelligence/:symbol/dashboard` | 심리 온도계·스마트 머니 게이지 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | `market/overview` 응답이 바뀌면 **실시간 테이블이 깨진다.** 계약 스냅샷 테스트로 고정한다 | Must |
| FR-41 | `market-intelligence` 응답이 바뀌면 게이지가 깨진다. 동일 | Must |
| FR-42 | 필드가 없으면 기본값을 만들지 않고 `unavailable`로 처리한다 | Must |

## Acceptance Criteria

- [ ] 제거 호출 7종이 BFF 코드에 0건이다
- [ ] `app-feed.service.ts` 파일이 남아 있고 호출만 끊겼다
- [ ] mutation 재시도가 0건이다
- [ ] 서버 에러 코드 4종이 그대로 전달된다
- [ ] **서버 DDD 이관 전/후 BFF 코드가 바뀌지 않았다** (diff 0)
- [ ] 계약 스냅샷 테스트가 이관 전/후 통과한다
- [ ] BFF가 `period`를 교정하지 않는다 (`miniute` → `miniute` 그대로 전달)
- [ ] 서버 422가 그대로 전달된다
- [ ] 현재가가 BFF 가격 캐시에서 읽힌다
- [ ] 캐시 미스 시 서버를 다시 부르지 않는다
- [ ] 국내·미국 주식이 `priceStale: true`다
- [ ] **`market/overview` 응답이 변경 전과 바이트 단위로 같다**
- [ ] `market-intelligence` 응답이 변경 전과 같다
- [ ] 필드 누락 시 기본값을 만들지 않는다

## Dependencies

- **선행:** `SRV-REQ-009`(서버 계약)
- **연동:** `SRV-REQ-010`(서버 DDD 이관) — FR-10~12가 그 이관의 안전망이다
- **규칙:** `backend-integration.md`

## Open Questions

- 국내·미국 주식 현재가를 BFF가 구독할지. **KIS 시세를 BFF가 구독하면 `priceStale`이 사라지지만** WS 관리가 늘어난다 → **서버가 스냅샷에 최신가를 넣는 것**이 더 단순하다(`BFF-REQ-013` Open Question과 동일).
- `market/overview` 스냅샷 테스트를 어디에 둘지(BFF vs 서버).

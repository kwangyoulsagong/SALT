---
id: BFF-REQ-007
feature: F000
area: bff
kind: FUNC
title: "F000 정리·편집 — BFF 조립 로직 정의 (route 정리 · 알림 축소 · 프리뷰 실데이터)"
priority: high
labels: [bff, cleanup, dormant, notification, news]
created: 2026-09-09
---

## Summary

BFF에서 F000이 하는 일은 **① 동면 route 제거 + 410 ② 알림 2종 축소 ③ 뉴스 프리뷰 실데이터 연결 ④ 관심 종목 조립 ⑤ `period` 오타 정정** 다섯이다. 새 계산은 없다.

## Requirements

### A. 동면 route 정리

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | `app.use("/api/app/feed")` 등록을 제거하고 `services/app-feed.service.ts` 호출을 끊는다. **파일은 남긴다** | Must |
| FR-2 | proxy에서 `/api/missions*` · `/api/users/points/*` · `/api/users/achievements` · `/api/dashboard*` 라우트를 제거한다 | Must |
| FR-3 | 제거된 경로에 **410 Gone + 1회 로그** 핸들러를 등록한다. 1주 유지 | Must |
| FR-4 | 410 응답에 `{ code: 'ENDPOINT_DORMANT', revivable: true }` | Should |
| FR-5 | 경로 목록을 **상수로 관리**한다. 되살릴 때 한 곳만 고친다 | Must |
| FR-6 | 410 로그를 1주 수집하고 잔여 호출이 0건인지 확인한다 | Must |

### B. 홈 조립 재작성 — 동면 소스가 사라진다

현재 `app-home.service`가 `/dashboard`와 `/investment-insight/top`을 부른다. **둘 다 동면 대상**이므로 이 조립은 곧 깨진다.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | `app-home.service`를 **블록 함수 구조로 재작성**한다(`BFF-REQ-027` F006이 최종 형태). F000에서는 **동면 소스 제거까지**만 한다 | Must |
| FR-11 | `Promise.all` → **`Promise.allSettled`** 로 바꾼다 | Must |
| FR-12 | `/dashboard` 호출을 제거한다. 홈 aggregation은 BFF가 담당한다 | Must |
| FR-13 | `/investment-insight/top` 호출을 제거한다 | Must |
| FR-14 | F000 시점의 홈은 **최소 구성**이다: 포트폴리오 요약 + 알림 2종 + 시장 개요. 5블록 완성은 F006 | Must |
| FR-15 | 반환을 **서버 응답 봉투가 아니라 뷰모델**로 만든다. `{ dashboard: dashboard.data }` 같은 형태를 없앤다 | Must |

### C. 알림 2종 축소

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `app-alerts.service`가 `kind`를 **`tax_deadline`·`signal_update` 2종**으로 필터한다 | Must |
| FR-21 | 서버가 다른 `kind`를 주면 **필터해서 버린다**(기존 row가 있을 수 있다). 오류로 만들지 않는다 | Must |
| FR-22 | 알림 응답에 **금액을 담지 않는다.** 서버가 담아 보내면 BFF가 제거한다 | Must |
| FR-23 | 알림 문구를 BFF가 만들지 않는다. **코드만** 전달 | Must |
| FR-24 | 정렬은 `createdAt` 내림차순. `limit` 기본 20 | Must |

### D. 뉴스 프리뷰 실데이터

현재 `MarketIntelligenceNewsPreview`가 상수이고 제목에 `faskdljf…` 테스트 문자열이 있다.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | `/api/app/news?symbol=&limit=5` 라우트를 추가하고 서버 `/api/news`를 부른다 | Must |
| FR-31 | 응답에 제목·요약·이미지·출처·발행시각을 담는다. **`content`(전문)를 담지 않는다** | Must |
| FR-32 | 뉴스가 없으면 **빈 배열**이다. **더미를 만들지 않는다** | Must |
| FR-33 | 이미지 URL이 없으면 `null`이다. 플레이스홀더 URL을 만들지 않는다 — 화면이 판단한다 | Must |
| FR-34 | `viewCount`는 서버가 주면 전달하고 없으면 생략한다. **BFF가 만들지 않는다** | Must |

### E. 관심 종목 조립

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | `/api/app/watchlist` 라우트를 추가한다(또는 기존 proxy 유지 + 현재가 보정) | Must |
| FR-41 | 서버 watchlist 응답에 현재가가 있으면 그대로, 없으면 **BFF 가격 캐시로 보정**한다 | Must |
| FR-42 | 국내·미국 주식은 가격 캐시에 없을 수 있다. **`priceStale: true`로 표시**하고 서버 값을 쓴다 | Must |
| FR-43 | 관심 종목이 0건이면 빈 배열. 빈 화면은 프론트가 처리한다 | Must |

### F. `period` 정정

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | 차트 프록시가 **`period=minute`** 으로 서버를 부른다. 프론트가 `miniute`를 보내면 **BFF가 교정하지 않고 422로 거부**한다 | Must |
| FR-51 | 교정하지 않는 이유: BFF가 오타를 흡수하면 프론트 오타가 영구화된다 | Must |
| FR-52 | 유효값 4종(`minute`·`day`·`week`·`month`)을 상수로 관리한다 | Must |

### G. 인증 경로 정리

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | proxy에서 `POST /api/auth/register`를 제거한다 | Must |
| FR-61 | `POST /api/app/onboarding/invite` → 서버 `/api/auth/invite/accept`를 부른다 | Must |
| FR-62 | `GET /api/app/onboarding/status` → 서버 `/api/onboarding/status` | Must |
| FR-63 | `GET /api/app/onboarding/invite/check` → 서버 `/api/auth/invite/check`. **인증 없이 통과**시키되 rate limit을 둔다 | Must |
| FR-64 | 초대 실패 `403` + `reasonCode`를 그대로 전달한다 | Must |

## Acceptance Criteria

- [ ] `/api/app/feed` 등록이 0건이고 서비스 파일은 남아 있다
- [ ] proxy에 `/api/missions*`·`/api/users/points/*`·`/api/users/achievements`·`/api/dashboard*`가 0건이다
- [ ] 동면 경로가 **410 Gone**이고 1회 로그를 남긴다
- [ ] 동면 경로 목록이 상수다
- [ ] **410 로그 1주 수집 결과 잔여 호출이 0건이다**
- [ ] `app-home.service`에 `/dashboard`·`/investment-insight/top` 호출이 0건이다
- [ ] `Promise.all`이 0건이다
- [ ] 홈 반환이 서버 응답 봉투가 아니라 뷰모델이다 (`.data` 중첩 0건)
- [ ] 알림 `kind`가 2종뿐이다
- [ ] 서버가 다른 `kind`를 줘도 오류 없이 필터된다
- [ ] 알림 응답에 금액이 0건이다
- [ ] 알림 문구가 코드다
- [ ] `/api/app/news`가 실데이터를 주고 **더미가 0건, `faskdljf` 0건**이다
- [ ] 뉴스 응답에 `content`가 0건이다
- [ ] 이미지 없으면 `null`이고 플레이스홀더 URL이 0건이다
- [ ] 관심 종목에 현재가가 있고 캐시 미스 시 `priceStale`이 표시된다
- [ ] `period=miniute`가 **422**이고 BFF가 교정하지 않는다
- [ ] `period=minute`가 200이다
- [ ] proxy에 `/api/auth/register`가 0건이다
- [ ] 온보딩 3개 라우트가 동작한다
- [ ] `invite/check`가 인증 없이 통과하고 rate limit이 있다
- [ ] 초대 `403` + `reasonCode`가 그대로 전달된다

## Dependencies

- **선행:** `BFF-REQ-006`(레이어) · `SRV-REQ-009`(서버 계약)
- **순서:** **프론트 → BFF → 서버.** 프론트가 동면 경로 호출을 먼저 끊는다
- **후속:** `BFF-REQ-027`(F006)이 홈 조립을 5블록으로 완성한다

## Open Questions

- 홈 최소 구성(FR-14)에 무엇을 넣을지. **F006에서 5블록으로 바뀔 것이므로 최소한으로** 하는 것이 낭비를 줄인다 → 포트폴리오 요약 + 알림만이 기본안.
- `viewCount`가 프리뷰에 필요한지(`SRV-REQ-008` Open Question).
- 410을 1주 후 무엇으로 바꿀지.

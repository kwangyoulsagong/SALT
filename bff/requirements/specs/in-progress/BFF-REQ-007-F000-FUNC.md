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

> **개정 2026-09-21** (감사 문서 `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` · ADR-002). ② 는 **1종**이 됐다. 셋이 늘었다: **⑥ 종목 검색 · 추적 상한 전달(D8) ⑦ 뉴스 감정 · 종목 · 북마크(B11 · D5) ⑧ 목표 수량 통과(B5)**. 여전히 새 계산은 없다.

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
| FR-14 | F000 시점의 홈은 **최소 구성**이다: 포트폴리오 요약 + 알림 + 시장 개요. **개정 2026-09-21** — 알림은 1종, 최종 형태는 5블록이 아니라 **F006 3블록(D6)** | Must |
| FR-15 | 반환을 **서버 응답 봉투가 아니라 뷰모델**로 만든다. `{ dashboard: dashboard.data }` 같은 형태를 없앤다 | Must |

### C. 알림 1종 축소 (개정 2026-09-21)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `app-alerts.service`가 `kind`를 **`signal_update` 1종**으로 필터한다. **개정 2026-09-21** — `tax_deadline` 은 ADR-002 · D5 로 소멸. 목록 · 읽음 · 안 읽은 수 확장은 F006 BFF REQ 가 소유 | Must |
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

### H. 종목 검색 · 추적 상한 (2026-09-21, D8)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-70 | `GET /api/app/search?q=&assetType=&limit=` 를 추가하고 서버 `GET /api/investment/search` 를 부른다. 인증 필수 | Must |
| FR-71 | 뷰모델로 옮긴다: `isTracked` · `isHeld` · `tracked{count,limit}` 를 **서버 값 그대로**. BFF 가 추적 여부를 다시 계산하지 않는다 | Must |
| FR-72 | 현재가가 없으면 `null`. 0 을 만들지 않는다. 검색 결과는 캐시하지 않는다(사용자별 판정) | Must |
| FR-73 | `POST /api/app/watchlist` 가 서버 **`409 TRACKED_ASSET_LIMIT` + `trackedCount` · `trackedLimit`** 을 그대로 전달한다. 500 으로 바꾸지 않는다 | Must |
| FR-74 | `GET /api/app/watchlist` 가 서버의 `tracked{count,limit}` 를 뷰모델에 싣는다. **신호(action · 점수) 필드를 싣지 않는다**(D4) | Must |

### I. 뉴스 — 감정 · 종목 · 북마크 (2026-09-21)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-80 | `toNewsPreviewViewModels` 가 **`sentiment` · `symbols` 를 버리지 않는다.** 지금은 둘 다 떨어진다(`bff/src/services/news.viewmodel.ts`) (기본안 — 감사 문서 B11) | Must |
| FR-81 | `sentiment` 가 `positive` · `neutral` · `negative` 밖이면 `null`. `symbols` 가 없으면 `[]`. BFF 가 값을 추정하지 않는다 (기본안 — 감사 문서 B11) | Must |
| FR-82 | 인증 요청이면 서버의 `isBookmarked` 를 전달한다. 무인증이면 필드를 생략한다(`/api/app/news` 는 공개 경로 유지) (D5) | Must |
| FR-83 | `POST /api/app/news/:id/bookmark` → 서버 `POST /api/news/bookmark { newsId: id }`. `DELETE /api/app/news/:id/bookmark` → 서버 `DELETE /api/news/bookmark/:id`. 둘 다 인증 필수, 성공 `204` (D5) | Must |
| FR-84 | `GET /api/app/news/bookmarks?page&limit` → 서버 `GET /api/news/bookmarks`. 항목은 FR-80 과 **같은 뷰모델**(`NewsPreviewVM`, `isBookmarked: true`). `content` 를 담지 않는다 (D5) | Must |
| FR-85 | 북마크는 **알림 조립에 들어가지 않는다.** `app-alerts.service` 가 북마크를 읽지 않는다 (D5) | Must |
| FR-86 | 북마크 mutation 은 재시도하지 않는다. 서버 404(없는 기사 · 없는 북마크)를 그대로 전달한다 (D5) | Must |

### J. 목표 수량 (2026-09-21)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-90 | `/api/goals*` proxy 가 `targetQuantity` · `symbol` 본문과 `goalType` · `currentQuantity` · `progressRate` 응답을 **그대로 통과**시킨다. BFF 가 진행률을 계산하지 않는다 (기본안 — 감사 문서 B5) | Should |
| FR-91 | 서버 422(`GOAL_TARGET_INVALID` · `GOAL_QUANTITY_NO_SAVINGS`)를 그대로 전달한다 (기본안 — 감사 문서 B5) | Should |

## Acceptance Criteria

- [ ] `/api/app/feed` 등록이 0건이고 서비스 파일은 남아 있다
- [ ] proxy에 `/api/missions*`·`/api/users/points/*`·`/api/users/achievements`·`/api/dashboard*`가 0건이다
- [ ] 동면 경로가 **410 Gone**이고 1회 로그를 남긴다
- [ ] 동면 경로 목록이 상수다
- [ ] **410 로그 1주 수집 결과 잔여 호출이 0건이다**
- [ ] `app-home.service`에 `/dashboard`·`/investment-insight/top` 호출이 0건이다
- [ ] `Promise.all`이 0건이다
- [ ] 홈 반환이 서버 응답 봉투가 아니라 뷰모델이다 (`.data` 중첩 0건)
- [ ] 알림 `kind`가 **1종**(`signal_update`)뿐이다 (개정 2026-09-21)
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

**추가 2026-09-21**

- [ ] `/api/app/search` 가 `isTracked` · `isHeld` · `tracked` 를 서버 값 그대로 준다
- [ ] 추적 상한 초과가 `409 TRACKED_ASSET_LIMIT` 로 전달된다 (500 0건)
- [ ] 관심 종목 뷰모델에 신호 필드가 0건이다
- [ ] `/api/app/news` 뷰모델에 `sentiment` · `symbols` 가 있다 (`news.viewmodel.test.ts`)
- [ ] 북마크 추가 · 해제 · 목록 3경로가 동작하고 목록이 같은 뷰모델이다
- [ ] `app-alerts.service` 에 북마크 참조가 0건이다
- [ ] `/api/goals` proxy 가 수량 필드를 통과시키고 422 를 그대로 전달한다

## Dependencies

- **선행:** `BFF-REQ-006`(레이어) · `SRV-REQ-009`(서버 계약)
- **순서:** **프론트 → BFF → 서버.** 프론트가 동면 경로 호출을 먼저 끊는다
- **후속:** `BFF-REQ-027`(F006)이 홈 조립을 5블록으로 완성한다

## Open Questions

- 홈 최소 구성(FR-14)에 무엇을 넣을지. **F006에서 5블록으로 바뀔 것이므로 최소한으로** 하는 것이 낭비를 줄인다 → 포트폴리오 요약 + 알림만이 기본안.
- `viewCount`가 프리뷰에 필요한지(`SRV-REQ-008` Open Question).
- 410을 1주 후 무엇으로 바꿀지.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-18 | **D·E·F절을 구현하고 `in-progress` 로 옮겼다.** 닫힌 것: FR-30~34(뉴스 프리뷰 실데이터) · FR-40~43(관심 종목 조립 · `priceStale` · 0건 빈 배열) · FR-50~52(`period` 교정하지 않고 422). **남은 것**: A절 FR-1~6(동면 route 410) · B절 FR-10~15(홈 조립 재작성) · C절 FR-20~24(알림 2종) · G절 FR-60~64(온보딩·인증). 근거: `requirements/reports/checklists/BFF-REQ-007.md` |
| 2026-09-18 | **G절을 구현했다.** 닫힌 것: FR-60~64(proxy `register` 제거 · 온보딩 3라우트 · `check` 무인증 + rate limit · `403` + `reasonCode` 그대로). `users/password`·`users/account` proxy 도 함께 제거. **남은 것**: A절(동면 410) · B절(홈 조립) · C절(알림 2종). 근거: `requirements/reports/checklists/BFF-REQ-007.md` §6~§8 |
| 2026-09-21 | **스토리보드 갭 감사 + ADR-002 반영.** 추가: H절 FR-70~74(종목 검색 · 추적 상한 409 전달 · 신호 필드 없음 — D8 · D4) · I절 FR-80~86(뉴스 뷰모델 `sentiment` · `symbols` 유지 · `isBookmarked` · 북마크 3경로 · 알림과 분리 — B11 · D5) · J절 FR-90~91(목표 수량 proxy 통과 — B5). 개정: FR-14 · 20 알림 2종 → **1종**, 홈 최종 형태 5블록 → F006 3블록(D6). 근거: `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` |

## 구현이 REQ와 다른 지점 (2026-09-18)

- **`priceStale` 을 캐시 적중이 아니라 "돌려주는 값의 나이"로 판정한다.** 구독을 부르는
  것은 `price-updater.worker` 이고 그건 별도 프로세스라, REST 만 띄우면 캐시가 비어
  **전부 지연으로 표시된다.** 서버 값이 기본이고 캐시는 빈 자리를 채우거나 더 새로울
  때만 이긴다(FR-41 의 의도 그대로). 임계값 60초는 실측(p50 2.5s · 최대 4.8s) 근거다.
- **`CHART_PERIODS` 를 `minute`·`day` 둘로 뒀다**(FR-52 는 넷을 적었다). 서버에
  `week`·`month` 경로가 없어서 넷을 적으면 BFF 는 통과시키고 서버가 422 를 준다.

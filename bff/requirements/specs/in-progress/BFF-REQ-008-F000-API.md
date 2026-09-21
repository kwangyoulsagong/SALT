---
id: BFF-REQ-008
feature: F000
area: bff
kind: API
title: "F000 정리·편집 — 프론트 대면 계약 정의"
priority: high
labels: [bff, api, contract, onboarding, cleanup]
created: 2026-09-09
---

## Summary

F000의 프론트 대면 계약. 신규는 **온보딩 3개**와 **뉴스·관심종목** 뿐이고, 나머지는 제거와 정정이다.

## 신규

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/api/app/onboarding/invite/check` | N | `?code=` | `{ valid, reasonCode? }` |
| POST | `/api/app/onboarding/invite` | N | `{ code, email, nickname, password }` | `{ accessToken, refreshToken, user }` / `403` |
| GET | `/api/app/onboarding/status` | Y | — | `OnboardingStatusViewModel` |
| GET | `/api/app/news` | Y | `?symbol=&limit=5` | `{ items: NewsPreviewVM[] }` |
| GET | `/api/app/watchlist` | Y | — | `{ items: WatchlistItemVM[] }` |
| POST/DELETE | `/api/app/watchlist` · `/:id` | Y | `{ assetType, symbol }` | `201` / `204` |
| GET | `/api/app/portfolio/summary` | Y | — | `PortfolioSummaryVM` |
| GET | `/api/app/search` | Y | `?q=&assetType=&limit=20` | `AssetSearchResultVM` (2026-09-21, D8) |
| GET | `/api/app/news/bookmarks` | Y | `?page=&limit=20` | `{ items: NewsPreviewVM[], pagination }` (2026-09-21, D5) |
| POST · DELETE | `/api/app/news/:id/bookmark` | Y | — | `204` (2026-09-21, D5) |

> **2026-09-21 — 기존 계약 변경(필드 추가 · 상태 코드 추가).** `POST /api/app/watchlist` → 추적 상한 초과 `409 { code: 'TRACKED_ASSET_LIMIT', trackedCount, trackedLimit }`(D8). `GET /api/app/watchlist` → `tracked{count,limit}` 추가. `GET /api/app/news` → `sentiment` · `symbols` · `isBookmarked?` 추가(기본안 — 감사 문서 B11). `/api/goals*` proxy → 수량 목표 필드 통과(기본안 — 감사 문서 B5).

## 제거

| Path | 조치 |
|---|---|
| `POST /api/auth/register` (proxy) | 제거 |
| `PATCH /api/users/password` · `DELETE /api/users/account` (proxy) | 제거 |
| `/api/app/feed` | 제거 → 410 |
| `/api/missions*` · `/api/users/points/*` · `/api/users/achievements` · `/api/dashboard*` (proxy) | 제거 → 410 |

## 뷰모델

```ts
// 개정 2026-09-21 — 2단계 'link_account'(계좌 연결)는 "첫 보유 기록 입력"으로 바뀐다(감사 문서 B12).
// 키 이름 변경은 F006 BFF REQ 가 소유한다 — **`link_account` → `first_holding` (BREAKING, `BFF-REQ-028`)**.
// 아래는 지금 코드의 계약이다. F006 이 들어오면 이 타입도 따라 바뀐다.
type OnboardingStatusViewModel = {
  complete: boolean;
  nextStep: 'invite' | 'link_account' | 'set_plan' | null;
  steps: Array<{ key: 'invite' | 'link_account' | 'set_plan'; done: boolean }>;
};

type NewsPreviewVM = {
  id: string;
  title: string;
  summary: string | null;
  imageUrl: string | null;       // 없으면 null. 플레이스홀더 URL 금지
  source: string;
  publishedAt: string;
  url: string;
  viewCount?: number;            // 서버가 주면 전달
  // --- 2026-09-21 추가 ---
  sentiment: 'positive' | 'neutral' | 'negative' | null;  // 셋 밖이면 null. BFF 가 추정하지 않는다 (B11)
  symbols: string[];             // 없으면 []. 화면이 종목 칩 → 상세로 잇는다 (B11)
  isBookmarked?: boolean;        // 인증 요청일 때만. 무인증이면 생략 (D5)
};

// 2026-09-21 (D8)
type AssetSearchResultVM = {
  items: Array<{
    symbol: string;
    name: string;
    assetType: 'crypto' | 'kr_stock' | 'us_stock';  // Q2 결정 전에는 실제로 'crypto' 만 온다
    currentPrice: number | null;
    change24h: number | null;
    isTracked: boolean;          // 관심 ∪ 보유 — 서버 값 그대로
    isHeld: boolean;             // 보유 종목. 상한에 세지 않는다
  }>;
  tracked: { count: number; limit: number };  // count 는 보유가 아닌 관심 종목 수
};

type WatchlistItemVM = {
  id: string;
  assetType: 'crypto' | 'kr_stock' | 'us_stock';
  symbol: string;
  name: string;
  currentPrice: number | null;
  priceChange24h: number | null;
  priceStale: boolean;           // 가격 캐시 미스
  lastUpdated: string | null;
  // 신호(action · 점수) 필드를 두지 않는다 — 감사 문서 D4. 판단은 우측 패널 · 상세(F004)
};
// 2026-09-21: 목록 응답은 { items: WatchlistItemVM[], tracked: { count, limit } } (D8)

type PortfolioSummaryVM = {
  items: Array<{ symbol: string; assetType: string; name: string; valueKrw: number | null; pnlRate: number | null }>;
  totalKrw: number | null;
  fxRateUsed: number | null;
  fxBasisCode: 'current_rate';   // 현재 환율 기준. (개정 2026-09-21 — 비교 대상이던 세금용 결제일 환율은 ADR-002 로 없다)
  status: 'ok' | 'unavailable';
};

type AlertVM = {
  id: string;
  kind: 'signal_update';                     // 1종 (개정 2026-09-21 — tax_deadline 은 ADR-002 로 소멸)
  messageCode: string;                       // 코드. 문구는 프론트
  params: Record<string, string | number>;   // 문구 치환용
  isRead: boolean;
  createdAt: string;
};
```

## 규약

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 알림 `kind`가 **1종(`signal_update`)뿐**이다. 타입으로 강제한다. **개정 2026-09-21** — 2종 → 1종(ADR-002 · D5) | Must |
| FR-2 | 알림은 `messageCode` + `params`다. **완성된 문장을 주지 않는다** | Must |
| FR-3 | 알림에 **금액 필드가 없다** | Must |
| FR-4 | 뉴스 `imageUrl`이 없으면 `null`. 플레이스홀더 URL 금지 | Must |
| FR-5 | 뉴스에 `content`(전문)가 없다 | Must |
| FR-6 | 관심 종목에 `priceStale`이 있다. 국내·미국 주식은 `true`일 수 있다 | Must |
| FR-7 | `portfolio/summary`에 `fxBasisCode: 'current_rate'`가 있다. ~~세금 계산과 기준이 다르다는 사실~~ **개정 2026-09-21** — 화면이 "현재 환율 기준"을 툴팁으로 알린다. 세금 계산은 ADR-002 로 없고, 미국주식 포함 여부는 Q2 | Must |
| FR-8 | 금액 실패 시 `null`. `0` 금지 | Must |
| FR-9 | 초대 실패는 `403` + `reasonCode`다. `reasonCode`는 코드이고 문구는 프론트 | Must |
| FR-10 | `invite/check`는 **상한 초과를 노출하지 않는다** | Must |
| FR-11 | 동면 경로는 **410 Gone**이다. 404 금지 | Must |
| FR-12 | `period` 유효값 4종. `miniute`는 **422** | Must |
| FR-13 | 뷰모델 타입을 `packages/core`로 공유 | Should |
| FR-14 | 유지 경로의 응답은 **하위 호환**이다. 필드 추가 허용, 제거·이름 변경은 프론트 동시 변경 | Must |
| FR-15 | 뉴스 뷰모델에 `sentiment` · `symbols` 가 **항상** 있다(값이 없으면 `null` · `[]`). 화면이 필드 존재를 분기하지 않게 한다 (기본안 — 감사 문서 B11) | Must |
| FR-16 | `isBookmarked` 는 **인증 요청에만** 있다. 무인증 뉴스 응답에 `false` 를 만들어 넣지 않는다 — "북마크 안 됨"과 "모름"은 다르다 (D5) | Must |
| FR-17 | 북마크 목록 항목은 `NewsPreviewVM` 과 **같은 타입**이다. 목록 전용 타입을 만들지 않는다 (D5) | Must |
| FR-18 | `AssetSearchResultVM.tracked.count` 는 **보유가 아닌 관심 종목 수**다. 화면의 `n / 10` 카운터가 이 값을 그대로 쓴다 (D8) | Must |
| FR-19 | 추적 상한 초과는 `409` + `code: 'TRACKED_ASSET_LIMIT'`. 문구는 프론트 (D8) | Must |
| FR-20 | 관심 종목 · 검색 뷰모델에 신호(action · 점수) 필드가 없다 (D4) | Must |
| FR-21 | 목표 응답의 `progressRate` 는 서버 값이다. BFF 가 수량 · 금액으로 다시 계산하지 않는다 (기본안 — 감사 문서 B5) | Should |

## Acceptance Criteria

- [ ] 신규 엔드포인트 7개가 등록된다
- [ ] 제거 경로 6종이 없거나 410이다
- [ ] 알림 `kind`가 **1종**이고 타입으로 강제된다 (개정 2026-09-21)
- [ ] 알림이 `messageCode` + `params`이고 완성 문장이 0건이다
- [ ] 알림에 금액 필드가 0건이다
- [ ] 뉴스 `imageUrl` 없으면 `null`이고 플레이스홀더 URL이 0건이다
- [ ] 뉴스에 `content`가 0건이다
- [ ] **뉴스에 `faskdljf` 등 테스트 문자열이 0건이다**
- [ ] 관심 종목에 `priceStale`이 있다
- [ ] `portfolio/summary`에 `fxBasisCode`가 있다
- [ ] 금액 실패 시 `null`이고 `0`이 0건이다
- [ ] 초대 실패가 `403` + `reasonCode`다
- [ ] `invite/check`가 상한 초과를 노출하지 않는다
- [ ] 동면 경로가 410이다
- [ ] `period=miniute`가 422다
- [ ] 유지 경로 응답 스냅샷이 하위 호환이다

**추가 2026-09-21**

- [ ] 신규 엔드포인트 3개(`search` · `news/bookmarks` · `news/:id/bookmark`)가 등록된다
- [ ] `AlertVM.kind` 가 1종이다
- [ ] 뉴스 뷰모델에 `sentiment` · `symbols` 가 항상 있고, `isBookmarked` 는 인증 요청에만 있다
- [ ] 북마크 목록 항목 타입이 `NewsPreviewVM` 이다
- [ ] 추적 상한 초과가 `409 TRACKED_ASSET_LIMIT` 다
- [ ] 관심 종목 · 검색 뷰모델에 신호 필드가 0건이다

## Dependencies

- **선행:** `BFF-REQ-007` · `SRV-REQ-009`
- **소비:** `FE-REQ-012`(F000 API) · `RN-REQ-006`(F000 API)

## Open Questions

- 알림 `params`의 구조. `messageCode`별로 필요한 키가 다르므로 **타입을 코드별로 좁힐 수 있는지** 검토(discriminated union).
- `portfolio/summary`가 홈 "주식" 섹션용인데 크립토를 포함할지(`SRV-REQ-008` Open Question).
- 관심 종목 CRUD를 proxy로 둘지 `/api/app`으로 옮길지. **현재가 보정이 필요하므로 `/api/app`** 이 기본안.
- 북마크 경로를 `/api/app/news/:id/bookmark`(기사 중심)로 둘지 `/api/app/bookmarks`(북마크 중심)로 둘지. **토글이 기사 카드에 붙으므로 기사 중심**이 기본안(2026-09-21).
- `assetType` 3값 union 을 유지할지 — 열린 질문 Q2.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-18 | **신규 계약 중 다섯을 열고 `in-progress` 로 옮겼다.** 닫힌 것: `GET·POST·DELETE /api/app/watchlist` · `GET /api/app/news` · `GET /api/app/portfolio/summary`. **남은 것**: 온보딩 3개(`invite/check` · `invite` · `status`) · 제거 목록(`/api/auth/register` 등). 근거: `requirements/reports/checklists/BFF-REQ-008.md` |
| 2026-09-18 | **온보딩 3계약을 열고 제거 목록을 닫았다.** `invite/check`(무인증·rate limit) · `invite`(무인증·`403 { reasonCode }`) · `status`(인증). FR-9·10 통과, **FR-13(`packages/core` 공유)은 미충족** — `bff` 가 workspace 밖이다. **남은 것**: 동면 경로 410(FR-11). 근거: `requirements/reports/checklists/BFF-REQ-008.md` |
| 2026-09-21 | **스토리보드 갭 감사 + ADR-002 반영.** 신규 계약 3개: `GET /api/app/search`(`AssetSearchResultVM`, D8) · `GET /api/app/news/bookmarks` · `POST·DELETE /api/app/news/:id/bookmark`(D5). 기존 계약 변경: watchlist `409 TRACKED_ASSET_LIMIT` · `tracked` · 뉴스 `sentiment` · `symbols` · `isBookmarked?`(B11) · 목표 수량 통과(B5). 규약 FR-15~21 추가. 개정: FR-1 · `AlertVM.kind` 2종 → **1종**. 관심 종목 뷰모델에 신호 필드 없음(D4) 명시. 근거: `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` |

## 구현이 REQ와 다른 지점 (2026-09-18)

**`GET /api/app/news` 를 인증 없이 열었다** (표는 Auth Y). 서버 `/news` 가 공개 경로이고
같은 프리뷰 패널의 차트·심리도 공개다 — 뉴스만 막으면 로그인 전 화면에서 그 블록만 빈다.
서버가 뉴스를 비공개로 바꾸면 여기도 같이 닫는다.

`PortfolioSummaryVM` 에 `namesDegraded` 를 더했다. 종목명을 시세 목록에서 붙이는데
그 조회가 실패해도 금액은 내려보내야 하고, 화면이 "이름이 심볼로 보이는 이유"를 알아야 한다.

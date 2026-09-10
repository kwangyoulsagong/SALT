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

## 제거

| Path | 조치 |
|---|---|
| `POST /api/auth/register` (proxy) | 제거 |
| `PATCH /api/users/password` · `DELETE /api/users/account` (proxy) | 제거 |
| `/api/app/feed` | 제거 → 410 |
| `/api/missions*` · `/api/users/points/*` · `/api/users/achievements` · `/api/dashboard*` (proxy) | 제거 → 410 |

## 뷰모델

```ts
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
};

type PortfolioSummaryVM = {
  items: Array<{ symbol: string; assetType: string; name: string; valueKrw: number | null; pnlRate: number | null }>;
  totalKrw: number | null;
  fxRateUsed: number | null;
  fxBasisCode: 'current_rate';   // 세금용 결제일 환율과 다르다
  status: 'ok' | 'unavailable';
};

type AlertVM = {
  id: string;
  kind: 'tax_deadline' | 'signal_update';   // 2종
  messageCode: string;                       // 코드. 문구는 프론트
  params: Record<string, string | number>;   // 문구 치환용
  isRead: boolean;
  createdAt: string;
};
```

## 규약

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 알림 `kind`가 **2종뿐**이다. 타입으로 강제한다 | Must |
| FR-2 | 알림은 `messageCode` + `params`다. **완성된 문장을 주지 않는다** | Must |
| FR-3 | 알림에 **금액 필드가 없다** | Must |
| FR-4 | 뉴스 `imageUrl`이 없으면 `null`. 플레이스홀더 URL 금지 | Must |
| FR-5 | 뉴스에 `content`(전문)가 없다 | Must |
| FR-6 | 관심 종목에 `priceStale`이 있다. 국내·미국 주식은 `true`일 수 있다 | Must |
| FR-7 | `portfolio/summary`에 `fxBasisCode: 'current_rate'`가 있다. **세금 계산과 기준이 다르다는 사실**을 화면이 툴팁으로 알려야 한다 | Must |
| FR-8 | 금액 실패 시 `null`. `0` 금지 | Must |
| FR-9 | 초대 실패는 `403` + `reasonCode`다. `reasonCode`는 코드이고 문구는 프론트 | Must |
| FR-10 | `invite/check`는 **상한 초과를 노출하지 않는다** | Must |
| FR-11 | 동면 경로는 **410 Gone**이다. 404 금지 | Must |
| FR-12 | `period` 유효값 4종. `miniute`는 **422** | Must |
| FR-13 | 뷰모델 타입을 `packages/core`로 공유 | Should |
| FR-14 | 유지 경로의 응답은 **하위 호환**이다. 필드 추가 허용, 제거·이름 변경은 프론트 동시 변경 | Must |

## Acceptance Criteria

- [ ] 신규 엔드포인트 7개가 등록된다
- [ ] 제거 경로 6종이 없거나 410이다
- [ ] 알림 `kind`가 2종이고 타입으로 강제된다
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

## Dependencies

- **선행:** `BFF-REQ-007` · `SRV-REQ-009`
- **소비:** `FE-REQ-012`(F000 API) · `RN-REQ-006`(F000 API)

## Open Questions

- 알림 `params`의 구조. `messageCode`별로 필요한 키가 다르므로 **타입을 코드별로 좁힐 수 있는지** 검토(discriminated union).
- `portfolio/summary`가 홈 "주식" 섹션용인데 크립토를 포함할지(`SRV-REQ-008` Open Question).
- 관심 종목 CRUD를 proxy로 둘지 `/api/app`으로 옮길지. **현재가 보정이 필요하므로 `/api/app`** 이 기본안.

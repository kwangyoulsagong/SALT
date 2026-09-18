# BFF-REQ-008 (F000 API) — 검증 체크리스트

- REQ: `requirements/specs/in-progress/BFF-REQ-008-F000-API.md`
- 브랜치: `feat/f000-watchlist-tab` · 검증일: 2026-09-18
- 상태: **부분 완료** — 신규 7개 중 5개를 열었다
- **전 영역 통합 기록**: 루트 `requirements/reports/checklists/F000-watchlist-tab.md`

## 1. 신규 계약

| Method | Path | 상태 | 실측 |
|---|---|---|---|
| GET | `/api/app/watchlist` | **열림** | 0건 `{items:[]}` · 크립토 실가격 `priceStale:false` · 주식 `null`+`true` · 토큰 없음 401 |
| POST | `/api/app/watchlist` | **열림** | 201 · 중복은 **서버 409 와 메시지를 보존** |
| DELETE | `/api/app/watchlist/:id` | **열림** | 204 |
| GET | `/api/app/news` | **열림** | 실기사 · `symbol` 누락 400 |
| GET | `/api/app/portfolio/summary` | **열림** | 이름 부착 · 합계 · `namesDegraded` |
| GET | `/api/app/onboarding/invite/check` | 미구현 | 서버 엔드포인트 선행 |
| POST | `/api/app/onboarding/invite` | 미구현 | 동일 |
| GET | `/api/app/onboarding/status` | 미구현 | 동일 |

제거 목록(`/api/auth/register` 등)은 손대지 않았다 — 초대 경로가 생긴 뒤에 지워야 로그인
경로가 비지 않는다.

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

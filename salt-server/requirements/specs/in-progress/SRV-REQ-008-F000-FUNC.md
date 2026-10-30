---
id: SRV-REQ-008
feature: F000
area: srv
kind: FUNC
title: "F000 정리·편집 — 도메인 로직 정의 (초대제 인증 · 관심종목 · 추적 자산 · 뉴스 · 알림 1종 · 목표 수량)"
priority: high
labels: [ddd, domain, auth, invite, watchlist, news, notification]
created: 2026-09-09
source: pm/requirements/specs/in-progress/FEATURE-000-scope-reset.md, pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md
---

> **2026-10-29 전수 조사 — 아래 본문 중 지금과 다른 것** (본문은 당시 기록으로 둔다)
> - FR-70~72(동면 · 되살리기)는 2026-10-27 `SRV-REQ-007` 에서 구현 — `DORMANT_PATHS` 410 · `/api/missions` 되살리기 1회 테스트
> - 초대 · 인증 · 온보딩 · watchlist · 뉴스 · period 수용 기준은 2026-09-18 Changelog 두 행이 닫았다(`auth/application/AcceptInviteCode.ts` · `onboarding/application/GetOnboardingStatus.ts`) — 체크박스 대신 체크리스트가 진실
> - FR-32 `AssetType` 3값: `kr_stock` 은 F011 이 닫음(2026-10-07) · `us_stock` 은 미국 주식 착수 때


## Summary

F000은 신규 엔진이 아니라 **기존 것을 고치고 좁히는 것**이다. 도메인 로직으로 새로 생기는 것은 **초대 코드 검증**과 **알림 타입 제한** 둘뿐이고, 나머지는 기존 로직을 컨텍스트로 옮기는 작업이다.

## 컨텍스트 배치

| 컨텍스트 | domain | application |
|---|---|---|
| `auth` | `InviteCode` Aggregate · `Session` VO · `InviteCodeStore` · `UserCountProbe` · `policy/inviteAcceptance` | `AcceptInviteCode` · `Login` · `RefreshSession` · `GetOnboardingStatus` |
| `market` | `Watchlist` Aggregate · `MarketAsset` VO · `WatchlistStore` · `MarketAssetProjection` · `CandleProbe` · **`HoldingProbe`** · **`policy/trackingLimit`** (2026-09-21) | `AddToWatchlist` · `RemoveFromWatchlist` · `ListWatchlist` · `GetMarketOverview` · `GetCandles` · **`SearchAssets`** (2026-09-21) |
| `news` | `NewsArticle` VO · `NewsStore` · `NewsProjection` · `BookmarkRepository` | `ListNews` · `GetNewsBySymbol` · `AddBookmark` · `RemoveBookmark` · `ListBookmarks`(이미 있다) |
| `notification` | `Notification` Aggregate · `NotificationKind` enum · `NotificationStore` · `policy/kindGate` | `ListNotifications` · `MarkRead` · `CreateNotification` |

## 초대 코드 — 신규 도메인 로직

글로벌 플랜 1-1절: **비공개·초대제(본인 + 최대 10명).**

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | `AcceptInviteCode`는 ① 코드 존재 ② 미사용(`usedByUserId == null`) ③ 미만료(`expiresAt > now`) ④ **활성 계정 수 < 상한(10)** 을 전부 검증한다 | Must |
| FR-2 | 검증 실패는 도메인 예외다: `InviteCodeNotFoundError` · `InviteCodeAlreadyUsedError` · `InviteCodeExpiredError` · `InviteQuotaExceededError`. 각각 `code`와 `ErrorKind`를 갖는다 | Must |
| FR-3 | **계정 상한은 `UserCountProbe`(Port)로 조회**한다. `auth` 도메인이 `User` 테이블을 직접 세지 않는다 | Must |
| FR-4 | 코드 사용은 **원자적**이다. 두 사람이 같은 코드를 동시에 쓰면 하나만 성공한다 → `usedByUserId` 조건부 UPDATE 또는 유니크 제약 | Must |
| FR-5 | **코드 없이 계정이 생성되는 경로가 없다.** `register` 유스케이스를 만들지 않는다 | Must |
| FR-6 | 상한(10)은 **설정값**이다. 코드 상수 금지 | Must |
| FR-7 | 실패한 코드 시도를 기록한다(무차별 대입 탐지). **다만 잠금 정책은 만들지 않는다** — 사용자 ≤10명이고 잠금이 본인을 막을 위험이 크다 | Should |

## 인증 축소

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 유지: `Login` · `RefreshSession` | Must |
| FR-11 | 제거: `Register` · `ChangePassword` · `DeleteAccount` 유스케이스. **화면도 함께 제거**(FE-REQ-011) | Must |
| FR-12 | 토큰 만료·재발급 경로는 유지한다. 인증 표면이 줄어도 세션 관리는 필요하다 | Must |
| FR-13 | **온보딩 상태**를 계산한다: `invite` → `link_account` → `set_plan`. 각 단계 완료 판정을 `policy/onboardingProgress`에 둔다. **개정 2026-09-21** — 2단계 "계좌 연결"이 **"첫 보유 기록 입력"(건너뛰기 가능)** 으로 바뀐다(기본안 — 감사 문서 B12). 단계 키 이름 · 건너뛰기 판정은 `FEATURE-006` 영역 REQ 가 소유한다 | Must |
| FR-14 | 온보딩 완료 판정의 입력은 ~~`ledger`(거래 존재)~~ **`portfolio`(보유 기록 존재)** · `plan`(설정 존재)의 **공개 API**다. Prisma를 직접 읽지 않는다. **개정 2026-09-21** — `ledger` 컨텍스트는 ADR-002 로 생기지 않는다 | Must |

## 알림 1종 제한 (개정 2026-09-21 — 2종 → 1종)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `NotificationKind`를 **`signal_update` 1종**으로 정의한다. **개정 2026-09-21** — ~~`tax_deadline`~~ 은 ADR-002 · 감사 문서 D5 로 빠졌다. 목록 · 읽음 · 모두 읽음 · 안 읽은 수는 `FEATURE-006` 이 소유한다. **뉴스 북마크는 알림 종류가 아니다**(FR-93) | Must |
| FR-21 | `policy/kindGate`가 **그 외 종류의 생성을 거부**한다. 기존 row의 다른 타입은 **읽기만 허용**한다 | Must |
| FR-22 | 센티먼트·고래·스마트머니 알림 **생성 코드를 실행하지 않는다.** 코드는 남기고 호출을 끊는다(동면) | Must |
| FR-23 | `MarketSentiment`·`WhaleTransaction` **조회 경로는 유지**한다. 프리뷰 화면(심리 온도계·스마트 머니 게이지)이 계속 읽는다 | Must |
| FR-24 | **알림에 금액을 담지 않는다.** 잠금 화면에 자산 금액이 뜨면 안 된다 | Must |
| FR-25 | 알림 문구를 서버가 만들지 않는다. **코드만** 주고 프론트 `shared/i18n`이 문장을 만든다 | Must |

## 관심 종목 — 기존 로직 유지

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | watchlist CRUD를 `market` 컨텍스트로 옮긴다. **동작을 바꾸지 않는다** | Must |
| FR-31 | `@@unique([userId, assetType, symbol])`를 유지한다 | Must |
| FR-32 | `AssetType` 3값을 받아들인다. 국내·미국 주식도 관심 종목이 될 수 있다. **개정 2026-09-21 — 보류(열린 질문 Q2).** 결정 전까지 현재 `AssetType` 값만 받는다 | Must |
| FR-33 | 관심 종목 목록에 **현재가·변동률을 포함**한다. 화면이 별도 조회하지 않게 | Must |

## 뉴스 — 실데이터 연결

현재 프리뷰가 상수이고 제목에 테스트 문자열(`faskdljf…`)이 남아 있다.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 심볼별 뉴스 조회를 제공한다. 프리뷰가 종목을 바꿀 때마다 부른다 | Must |
| FR-41 | `publishedAt` 내림차순. 개수 상한(기본 5) | Must |
| FR-42 | 제목·요약·이미지·출처·발행시각을 준다. `viewCount`는 **선택**이다(프리뷰에 필요한지 확인) | Must |
| FR-43 | 뉴스가 없으면 **빈 배열**이다. 더미를 만들지 않는다 | Must |
| FR-44 | `news-crawler.worker`를 유지한다. 실데이터가 필요하다 | Must |

## 차트 period 계약 정정

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | `period` 유효값을 `minute`·`day`·`week`·`month`로 정의한다. **`miniute`(오타)를 받지 않는다** | Must |
| FR-51 | 잘못된 `period`는 `422`로 거부한다. 조용히 기본값으로 처리하지 않는다 | Must |
| FR-52 | 프론트가 `miniute`를 보내고 있다(`constants/api.ts`). **프론트 수정이 선행**이고, 그 뒤에 서버가 오타를 받지 않게 된다 | Must |

## 포지션 요약 — 홈 "주식" 섹션용

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | 보유 요약을 제공한다: 종목·평가금액·손익률·자산군. 홈의 빈 "주식" 섹션을 채운다 | Must |
| FR-61 | **3자산군을 원화로 합산**한다. 미국주식은 현재 환율(세금용 결제일 환율과 다르다). **개정 2026-09-21** — 미국주식 포함 여부는 열린 질문 Q2. "세금용 결제일 환율" 비교 대상은 ADR-002 로 사라졌다 | Must |
| FR-62 | 환율 기준을 응답에 표시한다(`fxRateUsed`·`fxBasisCode`) | Must |
| FR-63 | Projection으로 조회한다. Aggregate를 로드하지 않는다 | Must |

## 추적 자산 · 종목 검색 (2026-09-21)

근거: `FEATURE-000` FR-40 · 41 · 감사 문서 D8. **추적 자산 = 관심 종목(`InvestmentWatchlist`) ∪ 보유 종목(`PortfolioHolding`, 수량 > 0).** 새 Aggregate 를 만들지 않는다(`DB-REQ-001` FR-50).

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-80 | `SearchAssets(userId, q, assetType?, limit)` 유스케이스. `MarketAsset` 활성 종목을 심볼 · 한글명 · 영문명 부분 일치로 찾는다. 결과마다 `isTracked` · `isHeld` 를 붙이고 `tracked { count, limit }` 를 함께 준다 | Must |
| FR-81 | `policy/trackingLimit`: **보유가 아닌 관심 종목 수 < 상한** 일 때만 `AddToWatchlist` 가 성공한다. 이미 보유한 종목의 추가는 상한과 무관하게 성공한다. 상한은 **설정값**(기본 10) — 코드 상수 금지 | Must |
| FR-82 | 상한 초과는 도메인 예외 `TrackedAssetLimitError`(`code: TRACKED_ASSET_LIMIT`, `ErrorKind: Conflict`)다. 응답에 `trackedCount` · `trackedLimit` 을 담는다 **구현 2026-10-30** — 두 수는 `DomainError.details` 로 본문 최상위에 싣는다(Shared Kernel 확장, `ddd-shared.md` §2) | Must |
| FR-83 | `isHeld` 는 **`HoldingProbe`(Port) → `portfolio` 공개 API** 로 읽는다. `market` 이 `PortfolioHolding` 을 Prisma 로 직접 읽지 않는다 | Must |
| FR-84 | 판정은 요청당 관심 · 보유 심볼 집합을 **한 번씩** 읽는다. 결과 행마다 조회하지 않는다(`DB-REQ-004` FR-41) | Must |
| FR-85 | 상한을 넘은 상태(보유 매도로 관심만 남은 경우)를 **자동으로 정리하지 않는다.** 새 등록만 막는다(`FEATURE-000` OQ-2 기본안) | Must |
| FR-86 | 검색어가 비면 결과 대신 `tracked` 목록(관심 ∪ 보유)을 준다. 검색어는 **로그에 남기지 않는다**(관심 종목은 투자 의도다) | Must |
| FR-87 | 열린 질문 Q2 결정 전까지 검색 대상은 현재 `MarketAsset` 에 있는 자산군뿐이다. 주식 시세 소스를 이 REQ 에서 만들지 않는다 **개정 2026-10-30(구현)** — Q2 가 닫혔다(F011 `kr_stock`, 2026-10-07). 검색 대상 = 코인(`MarketAsset`) + 국내 주식(`KrStockMaster`, **소유자만** — 비소유자는 마스터를 읽지도 않는다). 미국 주식(`stock`)은 시세 원천이 없어 제외 | Must |

## 뉴스 — 감정 · 종목 · 북마크 (2026-09-21)

근거: `FEATURE-000` FR-42 · 43 · 감사 문서 B11 · D5. 북마크 유스케이스와 route 는 **이미 있다**(`src/news/application/ManageBookmarks.ts` · `news.routes.ts` `POST /bookmark` · `GET /bookmarks` · `DELETE /bookmark/:id`).

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-90 | 뉴스 목록 · 심볼별 뉴스 · 북마크 목록 응답 항목에 `sentiment`(`positive` · `neutral` · `negative` · `null`)와 `symbols: string[]` 가 **빠지지 않는다.** 계약 테스트로 고정한다 (기본안 — 감사 문서 B11) | Must |
| FR-91 | `sentiment` 값이 셋 밖이면 `null` 로 내보낸다. 서버가 값을 추정해 채우지 않는다 (기본안 — 감사 문서 B11) | Must |
| FR-92 | 인증 헤더가 있으면 목록 항목에 `isBookmarked: boolean` 을 붙인다. 없으면 필드를 생략한다(공개 경로 유지 — `BFF-REQ-008` 2026-09-18 구현 차이) | Must |
| FR-93 | 북마크는 **알림을 만들지 않는다.** `notification` 컨텍스트를 부르지 않는다(D5) | Must |
| FR-94 | `DELETE /bookmark/:id` 의 `:id` 는 **`newsId`** 다(북마크 row id 가 아니다 — `RemoveBookmark.execute(userId, newsId)`). 계약 문서에 그렇게 적는다 | Must |
| FR-95 | 감정은 **표시용**이다. `ai-coach` 점수 입력 · 알림 트리거로 쓰지 않는다(스토리보드 `news` "뉴스가 하지 않는 것") | Must |

## 목표 수량 (2026-09-21)

근거: `FEATURE-000` FR-44 · 감사 문서 B5. 대상은 `src/modules/goals`(DDD 이관 전).

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-100 | 목표 생성 · 수정이 `targetAmount` **또는** `targetQuantity` + `symbol` 중 정확히 하나를 받는다. 둘 다 / 둘 다 없음은 **422** (기본안 — 감사 문서 B5) | Should |
| FR-101 | `targetQuantity` 는 `Decimal` 로 받고 계산한다. `Float` 경유 금지(`DB-REQ-002` FR-2) (기본안 — 감사 문서 B5) | Should |
| FR-102 | 수량 목표의 `currentQuantity` · `progressRate` 는 **서버가** 보유 수량(`portfolio` 공개 API) ÷ `targetQuantity` 로 계산해 응답에 싣는다. 저장하지 않는다(`DB-REQ-001` FR-43) (기본안 — 감사 문서 B5) | Should |
| FR-103 | 금액 목표의 기존 동작 · 응답은 **바꾸지 않는다.** 필드 추가만 한다(`goalType: 'amount' \| 'quantity'` 파생) (기본안 — 감사 문서 B5) | Should |
| FR-104 | 수량 목표에 `POST /goals/:id/savings`(금액 적립)를 부르면 **422** 다. 수량은 보유가 말한다 (기본안 — 감사 문서 B5) | Should |

## 동면 — 코드는 남기고 호출을 끊는다

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-70 | `mission` · `feed` · `dashboard` · `insight-ranking` 유스케이스를 **DDD로 옮기지 않는다.** `src/modules/` 아래 그대로 둔다 | Must |
| FR-71 | 그 route를 등록하지 않는다. **코드·모델은 삭제하지 않는다** | Must |
| FR-72 | 되살리기 테스트를 1회 수행한다: route 재등록 → 200 → 되돌림 | Must |

## Acceptance Criteria

- [ ] `AcceptInviteCode`가 검증 4개(존재·미사용·미만료·상한)를 전부 수행한다
- [ ] 도메인 예외 4종이 각각 `code`와 `ErrorKind`를 갖는다
- [ ] `auth` 도메인이 `User` 테이블을 직접 세지 않는다 (`UserCountProbe` 경유)
- [ ] 같은 코드를 동시에 사용하면 **하나만 성공한다** (동시 요청 테스트)
- [ ] **`register` 유스케이스가 0건이다**
- [ ] 계정 상한이 설정값이다 (코드 상수 0건)
- [ ] `ChangePassword`·`DeleteAccount` 유스케이스가 0건이다
- [ ] 토큰 재발급이 동작한다
- [ ] 온보딩 상태 3단계가 계산되고 `portfolio`·`plan`의 공개 API를 경유한다 (개정 2026-09-21 — `ledger` 없음)
- [x] `NotificationKind`가 **1종**(`signal_update`)이다 (개정 2026-09-21) (2026-10-28 — `notification/domain/NotificationKind`)
- [x] **그 외 종류 생성이 거부되고 기존 row 읽기는 허용된다** (2026-10-28 — `kindGate` 422. 옛 행은 지우지 않지만 목록 · 안 읽은 수는 `SRV-REQ-028` FR-94 대로 1종만 보여 준다 — 아래 "구현이 REQ와 다른 지점")
- [x] 센티먼트·고래 알림 생성 코드가 실행되지 않는다 (2026-10-28 확인 — `src` 에 `SentimentAlert` · `SmartMoneyAlert` 생성 0건, 모델만 남음)
- [ ] `MarketSentiment`·`WhaleTransaction` 조회가 동작한다
- [x] 알림 페이로드에 금액이 0건이다 (2026-10-28 — `messageGuard` 금액 키 · 숫자 값 거부, 목록은 문자열 인자만)
- [x] 알림 문구가 코드이고 서버가 문장을 만들지 않는다 (2026-10-28 — `messageCode` + `params`, `title` · `message` 새 행 NULL)
- [ ] watchlist CRUD가 `market` 컨텍스트에 있고 동작이 이전과 같다
- [ ] watchlist가 `AssetType` 3값을 받는다
- [ ] 관심 종목 목록에 현재가·변동률이 포함된다
- [ ] 심볼별 뉴스가 실데이터로 조회되고 **더미가 0건이다**
- [ ] 뉴스가 없으면 빈 배열이다
- [ ] `period=miniute`가 `422`로 거부된다
- [ ] 보유 요약이 3자산군 원화 합산이고 `fxRateUsed`가 있다
- [ ] 보유 요약이 Projection으로 조회된다
- [ ] 동면 모듈 코드가 `src/modules/`에 남아 있다
- [ ] 되살리기 테스트 1회 통과

**추가 2026-09-21**

- [ ] `SearchAssets` 결과에 `isTracked` · `isHeld` · `tracked{count,limit}` 가 있다
- [ ] 보유 아닌 관심 종목 10개에서 11번째 추가가 `TrackedAssetLimitError` 다. 보유 종목 추가는 성공한다
- [ ] 추적 상한이 설정값이다 (코드 상수 0건)
- [ ] `market` 이 `PortfolioHolding` 을 직접 읽지 않는다 (`HoldingProbe` 경유)
- [ ] 판정이 요청당 쿼리 1~2회다 (N+1 0건)
- [ ] 검색어가 로그에 0건이다
- [ ] 뉴스 목록 · 북마크 목록 항목에 `sentiment` · `symbols` 가 있다 (계약 테스트)
- [ ] 인증 시 `isBookmarked` 가 있고 무인증 시 필드가 없다
- [ ] 북마크 추가 · 해제가 알림 row 를 만들지 않는다
- [ ] 수량 목표 생성이 되고, 금액 · 수량 동시 입력이 422 다
- [ ] 수량 목표 진행률이 보유 수량 기준으로 계산되고 저장되지 않는다
- [ ] 기존 금액 목표 응답이 하위 호환이다

## Dependencies

- **선행:** `SRV-REQ-006`(DDD) · `SRV-REQ-007`(정리) · `DB-REQ-001`(`InviteCode`·`AssetType`·`Goal` 수량 — FR-40~43)
- **정리 항목 참조(2026-09-21):** 레거시 모델 · 중복 worker · 동면 410 · `AssetType` 은 `SRV-REQ-007` · `SRV-REQ-010` 이 가진다(감사 문서 §4 `scope` 행 — 코드 미완)
- **연동:** `FE-REQ-011`(F000 FUNC)이 `period` 오타를 먼저 고친다
- **규칙:** `ddd-domain.md` · `ddd-application.md`

## Open Questions

- 초대 코드 발급을 시드로만 할지 관리 화면을 만들지. **10명이면 시드로 충분**하다(FEATURE-000 FR-23).
- 계정 상한 초과 시 어떻게 되는가. 기존 계정을 지워야 새 사람이 들어올 수 있다 → **상한을 늘리는 것이 설정값이므로 문제가 아니다.**
- `viewCount`가 프리뷰에 실제로 필요한지. 현재 상수로 들어가 있어 요구사항인지 불명확하다.
- 홈 "주식" 섹션이 3자산군 전부인지 주식만인지. **제목이 "주식"이므로 크립토를 제외해야 할 수 있다** → PM 확인 필요.
- **Q2(감사 문서)** — `AssetType` 3값 · 미국주식 원화 합산(FR-32 · 61 · 62)이 결정을 기다린다.
- 추적 자산에만 지표 · 코치를 계산할지(스토리보드 `search` extra). F000 은 판정(`isTracked`)만 제공하고 계산 범위 축소는 F004 가 소비한다(`FEATURE-000` OQ-4).
- 같은 종목 수량 목표가 둘이면 둘 다 같은 보유를 본다 — 목표별로 나눠 셀지(`FEATURE-000` OQ-3). 기본은 나누지 않는다.

## Changelog

- 2026-10-27: F011 슬라이스 6b(호가 · 시간외 단일가 · KIS 우선순위) — `market` 공개 팩토리에 국내 유스케이스 2개(`getOrderbook` · `pollAfterHours`) · `schema.prisma` `kr_stock_quotes` nullable 칸 5개 · `env.ts` 주석만(기본 속도 실험 기록 — 값 3 그대로). 이 REQ 의 관심 종목 · 추적 자산 규칙은 그대로(본문 `SRV-REQ-040` FR-51~53)
- 2026-10-26: F011 슬라이스 6(국내 지수 · 투자자 순매수) — `market` 공개 팩토리(`application/api`)에 국내 유스케이스 4개 · `schema.prisma` 새 표 2개 · `env.ts` `KIS_SUMMARY_INDICES`. 이 REQ 의 관심 종목 · 추적 자산 규칙은 그대로(본문 `SRV-REQ-040` FR-49 · 50)
| 날짜 | 변경 |
|---|---|
| 2026-09-18 | **관심 목록·뉴스·차트·포지션 요약을 구현하고 `in-progress` 로 옮겼다.** 닫힌 것: FR-30·33(watchlist 동작 유지 + 현재가·변동률 포함) · FR-40~44(뉴스 — 이미 있던 조회를 소비처가 생겼다) · FR-50~52(`period` 422) · FR-60·63(보유 요약 · Projection 조회). **남은 것**: FR-1~7(초대 코드) · FR-10~14(인증 축소·온보딩 상태) · FR-20~25(알림 2종) · FR-32(`AssetType` 3값 — `DB-REQ-003` 대기) · FR-61·62(환율 — `fx` 컨텍스트 대기) · FR-70~72(동면). 근거: `requirements/reports/checklists/SRV-REQ-008.md` |
| 2026-09-18 | **초대 코드·인증 축소·온보딩 상태를 구현했다.** 닫힌 것: FR-1~7(검증 4개 · 예외 4종 · `UserCountProbe` · 원자적 사용 · 상한 설정값 · 실패 기록) · FR-10~12(인증 축소, `register`·`ChangePassword`·`DeleteAccount` **유스케이스 0건**) · FR-13·14(온보딩 3단계 — **소스는 대체**). **남은 것**: FR-20~25(알림 2종) · FR-32(`AssetType`) · FR-61·62(환율) · FR-70~72(동면). 근거: `requirements/reports/checklists/SRV-REQ-008.md` §5~§8 |
| 2026-09-21 | **스토리보드 갭 감사 + ADR-002 반영.** 추가: FR-80~87(추적 자산 · 종목 검색 — 관심 ∪ 보유, 상한 10 설정값, 보유는 무관, `HoldingProbe`, D8) · FR-90~95(뉴스 `sentiment` · `symbols` 유지 · `isBookmarked` · 북마크는 알림 아님, B11 · D5) · FR-100~104(목표 수량, 기본안 B5). 개정: FR-20 알림 2종 → **1종** · FR-13 · 14 온보딩 2단계 → 첫 보유 기록(B12), 입력 `ledger` → `portfolio` · FR-32 · 61 **Q2 보류**. 근거: `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` |
| 2026-10-28 | **알림 1종 · 코드만 · 금액 없음을 닫았다**(FR-20~22 · 24 · 25, 루트 `F000-notification-kind-gate`, `feat/f000-notification-kind-gate` `3320883`). 새 `notification` 컨텍스트(레지스트리 기존 행) — 만드는 길은 공개 API `NotificationApi.publish` 하나이고 관문 셋(`policy/kindGate` · `messageGuard` 코드 형식 · 금액 인자)이 거기 있다. 코치 판단 변화는 `decision_change` + 완성 문장 → `signal_update` + `coach.decision_changed` + 코드 인자. 마이그레이션 `20261028100000_notification_message_code`(`messageCode` 추가 · `title`/`message` nullable). `modules/investment-notification` 삭제(경로 같음). FR-23 은 손대지 않음(조회 경로 그대로) |
| 2026-10-08 | F011 슬라이스 3b — `UpdateHoldingPrices`(BFF 내부 시세 반영)가 `crypto` 보유만 갱신(`findBySymbols(symbols, assetType)`). 국내 주식 보유는 서버가 저장 시세로 평가(`RevalueKrStockHoldings`, `SRV-REQ-040` FR-34). 보유 요약 · 통계는 자산군을 섞어 그대로 합산(원화끼리) |

## 구현이 REQ와 다른 지점 (2026-10-28)

- **FR-21 "기존 row 읽기 허용"을 "지우지 않는다"로 읽었다.** 목록 · 안 읽은 수 · 읽음 · 모두 읽음은 1종만 본다 — 안 읽은 수가 목록과 같아야 하고(`DB-REQ-022` FR-83) F006 이 같은 경로를 1종으로 좁힌다(`SRV-REQ-028` FR-94). 옛 종류를 따로 보여 줄 화면이 없다. 로컬 DB 알림 행은 0건이었다
- **알림 생성 HTTP 경로는 만들지 않았다**(`SRV-REQ-009` FR-12). 만드는 쪽이 서버 안(코치 · 이후 F003 밴드)뿐이라 공개 API 가 생성 지점이고, 거부는 `ErrorKind.Blocked` → 422 다

## 구현 중 드러난 사실 (2026-09-18)

- **`ListWatchlist` 가 Prisma `Decimal` 을 그대로 내보내고 있었다.** JSON 에서 문자열
  (`"158000000"`)로 나가서 화면이 숫자로 쓰면 죽는다. 소비처가 없어서 아무도 몰랐다.
- **`/api/portfolio/internal/update-prices` 를 부르는 곳이 없었다.** 보유 평가금액이
  생성 이후 영원히 0 이었다. BFF 워커가 관심 목록 쪽만 밀어 넣고 있었다.
- 그 유스케이스는 **심볼마다 조회를 돌았다.** 살리면 5초마다 100번이라 한 번 읽고
  해당 보유만 갱신하도록 바꿨다(`findBySymbols`).
- FR-61·62 의 환율 필드는 **자리만 만들고 `null`** 이다. 보유가 전부 원화 크립토이고
  `fx` 컨텍스트가 없다 — 미국주식이 들어올 때 응답 모양이 바뀌지 않게 지금 뒀다.
- 2026-10-29: 전수 조사 — 현재와 다른 서술 정정(머리 블록). 본문은 당시 기록으로 둠
- 2026-10-30: **F000 종목 검색 · 추적 자산 상한 구현**(`feat/f000-asset-search` `34128987` · 커널 `36368363`). FR-80~87 — `SearchAssets` · `policy/trackingLimit`(보유가 아닌 관심 수 < `TRACKED_ASSET_LIMIT` 기본 10) · `TrackedAssetLimitError`(409 + `trackedCount` · `trackedLimit`, `DomainError.details`) · `HoldingProbe` = `HeldAssetsAdapter`(→ `portfolio.api.listHoldings`, 수량 0 제외) · 요청당 관심 · 보유 1회 · 자동 정리 없음 · 빈 검색어 = 추적 목록 · 검색어 로그 `q=*`. **FR-87 개정** — Q2 닫힘, 코인 + 국내(소유자만). 중복 검사가 상한보다 먼저. 루트 `requirements/specs/in-progress/F000-asset-search-slice.md`

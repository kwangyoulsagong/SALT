---
id: SRV-REQ-008
feature: F000
area: srv
kind: FUNC
title: "F000 정리·편집 — 도메인 로직 정의 (초대제 인증 · 관심종목 · 뉴스 · 알림 2종)"
priority: high
labels: [ddd, domain, auth, invite, watchlist, news, notification]
created: 2026-09-09
source: pm/requirements/specs/in-progress/FEATURE-000-scope-reset.md
---

## Summary

F000은 신규 엔진이 아니라 **기존 것을 고치고 좁히는 것**이다. 도메인 로직으로 새로 생기는 것은 **초대 코드 검증**과 **알림 타입 제한** 둘뿐이고, 나머지는 기존 로직을 컨텍스트로 옮기는 작업이다.

## 컨텍스트 배치

| 컨텍스트 | domain | application |
|---|---|---|
| `auth` | `InviteCode` Aggregate · `Session` VO · `InviteCodeStore` · `UserCountProbe` · `policy/inviteAcceptance` | `AcceptInviteCode` · `Login` · `RefreshSession` · `GetOnboardingStatus` |
| `market` | `Watchlist` Aggregate · `MarketAsset` VO · `WatchlistStore` · `MarketAssetProjection` · `CandleProbe` | `AddToWatchlist` · `RemoveFromWatchlist` · `ListWatchlist` · `GetMarketOverview` · `GetCandles` |
| `news` | `NewsArticle` VO · `NewsStore` · `NewsProjection` | `ListNews` · `GetNewsBySymbol` |
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
| FR-13 | **온보딩 상태**를 계산한다: `invite` → `link_account` → `set_plan`. 각 단계 완료 판정을 `policy/onboardingProgress`에 둔다 | Must |
| FR-14 | 온보딩 완료 판정의 입력은 `ledger`(거래 존재)·`plan`(설정 존재)의 **공개 API**다. Prisma를 직접 읽지 않는다 | Must |

## 알림 2종 제한

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `NotificationKind`를 **`tax_deadline`·`signal_update` 2종**으로 정의한다 | Must |
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
| FR-32 | `AssetType` 3값을 받아들인다. 국내·미국 주식도 관심 종목이 될 수 있다 | Must |
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
| FR-61 | **3자산군을 원화로 합산**한다. 미국주식은 현재 환율(세금용 결제일 환율과 다르다) | Must |
| FR-62 | 환율 기준을 응답에 표시한다(`fxRateUsed`·`fxBasisCode`) | Must |
| FR-63 | Projection으로 조회한다. Aggregate를 로드하지 않는다 | Must |

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
- [ ] 온보딩 상태 3단계가 계산되고 `ledger`·`plan`의 공개 API를 경유한다
- [ ] `NotificationKind`가 2종이다
- [ ] **그 외 종류 생성이 거부되고 기존 row 읽기는 허용된다**
- [ ] 센티먼트·고래 알림 생성 코드가 실행되지 않는다
- [ ] `MarketSentiment`·`WhaleTransaction` 조회가 동작한다
- [ ] 알림 페이로드에 금액이 0건이다
- [ ] 알림 문구가 코드이고 서버가 문장을 만들지 않는다
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

## Dependencies

- **선행:** `SRV-REQ-006`(DDD) · `SRV-REQ-007`(정리) · `DB-REQ-001`(`InviteCode`·`AssetType`)
- **연동:** `FE-REQ-011`(F000 FUNC)이 `period` 오타를 먼저 고친다
- **규칙:** `ddd-domain.md` · `ddd-application.md`

## Open Questions

- 초대 코드 발급을 시드로만 할지 관리 화면을 만들지. **10명이면 시드로 충분**하다(FEATURE-000 FR-23).
- 계정 상한 초과 시 어떻게 되는가. 기존 계정을 지워야 새 사람이 들어올 수 있다 → **상한을 늘리는 것이 설정값이므로 문제가 아니다.**
- `viewCount`가 프리뷰에 실제로 필요한지. 현재 상수로 들어가 있어 요구사항인지 불명확하다.
- 홈 "주식" 섹션이 3자산군 전부인지 주식만인지. **제목이 "주식"이므로 크립토를 제외해야 할 수 있다** → PM 확인 필요.

# 아키텍처 개요 — 네 서피스, 하나의 원칙

SALT는 **네 서피스**로 구성된다. 같은 원칙을 쓰고 각자의 언어를 쓴다.

| 서피스 | 경로 | 방법론 | 레이어 |
|---|---|---|---|
| 웹 (default zone) | `apps/web` | **FSD** | `shared` → `entities` → `features` → `widgets` → `pages` → `app` |
| 웹 (세금 zone) | `apps/web-tax` | **FSD** | 동일 |
| 모바일 | `apps/mobile` | **FSD** | 동일 (`pages` = 화면 셸) |
| BFF | `bff/src` | 레이어드 | `routes` → `controllers` → `services` |
| 서버 | `salt-server/src` | **DDD** | `{context}/{domain · application · infrastructure · presentation}` |

FSD는 프론트엔드 방법론이다. `widgets`·`pages`는 Express 서버에서 뜻이 없다. **이름을 통일하지 않는 이유**는 이름이 뜻을 잃으면 규칙이 번역표가 되고, 번역표는 지켜지지 않기 때문이다.

교차 locality는 레이어 이름이 아니라 **슬라이스 이름**이 만든다.

```
청구서 기능을 찾을 때:
  apps/web/src/features/invoice/...        (웹 — 인터랙션)
  apps/mobile/src/features/invoice/...     (모바일 — 인터랙션)
  bff/src/services/app-invoice.service.ts  (BFF — 뷰모델)
  salt-server/src/invoice/...              (서버 — Bounded Context)
```

## 1. 의존은 한 방향으로만 흐른다

```
웹·모바일  shared(0) → entities(1) → features(2) → widgets(3) → pages(4) → app(5)
BFF        routes → controllers → services
서버       presentation → application → domain ← infrastructure
```

서버만 선형이 아니다. `application`과 `infrastructure`는 **둘 다 `domain`에 의존하고 서로에게는 의존하지 않는다** — 의존 역전이다(`salt-server/.claude/rules/ddd-domain.md` §3).

## 2. 같은 레이어의 다른 슬라이스를 직접 import하지 않는다

공통이 필요하면 **아래 레이어로 내린다.** 두 feature가 같은 것을 필요로 하면 그것은 사실 entity거나 shared다.

우리 기능들은 데이터를 공유한다 — 청구서는 원장·가격·편향을, 세금은 원장·환율·취득가액을, 코치는 지표·성적표·실패이력을 쓴다. **cross-slice import로 해결하면 몇 달 뒤 전부 서로를 부른다.**

## 3. 위반은 쓰기 시점에 막힌다

`.claude/hooks/layer-check.mjs`가 Edit/Write 직전에 검사하고 exit 2로 차단한다. 규칙 표는 `layer-rules.mjs`에 있다. **훅이 막으면 우회하지 말고 구조를 고친다.**

ESLint(`packages/eslint-config`)가 같은 것을 에디터에서 보여준다. 겹치는 것은 의도적이고 **피드백 시점이 다르다.**

훅이 막는 것:

| 금지 | 왜 |
|---|---|
| 상위 레이어 import | 의존 방향 |
| 같은 레이어의 다른 슬라이스 | §2 |
| 슬라이스 내부 경로 직접 참조 (`@/entities/tax/model/types`) | barrel의 유일한 목적이 내부 구조 변경 차단이다 |
| `apps/web-tax` → `apps/web/src/**` | zone은 독립 배포 단위다 |
| `apps/mobile` → `packages/ui` | vanilla-extract는 RN에서 동작하지 않는다 |
| 루트 `app/**`·`pages/**`에 re-export 외의 코드 | 라우팅 파일은 연결만 한다 |
| 레지스트리에 없는 슬라이스 생성 | §4 |

## 4. 슬라이스 레지스트리

새 슬라이스는 **이 표에 먼저 추가**한다. 웹·모바일은 하이픈 허용, 서버 컨텍스트는 하이픈 없이.

| 슬라이스 | 책임 | 서버 컨텍스트 |
|---|---|---|
| `auth` | 초대 코드 검증 · 세션 · 토큰 갱신 | `auth` |
| `ledger` | 거래 원장 · CSV import · 거래소 조회 키 · 원장 건강도 | `ledger` |
| `portfolio` | 보유 · 포지션 · 평가금액 · 3자산군 합산 | `portfolio` |
| `market` | 시세 · 실시간 구독 · 차트 · 관심 종목 | `market` |
| `coach` | 추천 · 점수 · 근거 3종 · 대화 · 성적표 · 피드백 | `coach` |
| `invoice` | 반사실 3트랙 · 거래별 귀속 · 편향 집계 | `invoice` |
| `tax` | 취득가액 lot · 손실수확 솔버 · 환율 함정 · 스텝업 · 증빙 | `tax` |
| `plan` | 밸류에이션 밴드 · 주간 적립 · 김프 · 실행 기록 | `plan` |
| `indicator` | 지표 스냅샷 · **실패 이력**(추천 렌더 게이트의 근거) | `indicator` |
| `fx` | 환율 원장 · 결제일 기준환율 | `fx` |
| `goal` | 목표 저축 (변경 금지 목록) | `goal` |
| `news` | 뉴스 목록 · 프리뷰 | `news` |
| `notification` | 알림 2종 (세금 D-Day · 지표/추천 갱신) | `notification` |
| `device` | 디바이스 등록 · 푸시 토큰 · 앱 버전 게이트 (모바일만) | `device` |

### 조합 슬라이스 (`widgets`)

| widget | 엮는 것 |
|---|---|
| `home-briefing` | portfolio + plan + coach + tax + invoice |
| `coach-console` | coach + indicator + portfolio |
| `asset-workspace` | portfolio + invoice + tax |
| `market-board` | market + news + indicator |
| `onboarding-flow` | auth + ledger + plan |
| `pc-panel-grid` | `MovableGrid` + 위 widget들 |

## 5. Next.js 라우팅과 FSD의 관계

**라우팅 디렉터리는 프로젝트 루트, FSD는 `src/`.** FSD 공식 Next.js 가이드 방식이며 Pages Router와 App Router 둘 다에 적용된다.

```
apps/web/
├── app/          Next 라우팅 — @/pages/* re-export만
├── pages/        빈 폴더 (App Router에서도 필수). README.md만
├── middleware.ts · instrumentation.ts
└── src/
    ├── app/      FSD app 레이어 — 프로바이더 · 전역 스타일 · api-routes
    ├── pages/    FSD pages 레이어 — 라우트 셸
    ├── widgets/ features/ entities/ shared/
```

```tsx
// app/page.tsx
export { HomePage as default, metadata } from '@/pages/home';
```

> **루트 `app/`은 라우팅이고 `src/app/`은 FSD 초기화다.** 이름이 같으니 매번 확인한다.

## 6. 인터페이스 정의 (TypeScript)

`{slice}/model/types.ts`에 둔다.

- **`interface` 우선** — 데이터 구조, 요청/응답 DTO
- **`enum`** — 열거값은 반드시 enum. 문자열 리터럴 union 금지
- **`type` alias** — 두 개 이상을 union/intersection으로 조합할 때만
- DTO 네이밍: `{Action}{Entity}Request` · `{Action}{Entity}Response`
- `any` 금지 — 불가피하면 `unknown` + 타입 가드
- BFF 뷰모델 타입은 **BFF가 소유한 계약**이다. 프론트가 다시 정의하지 않고 `packages/core`에서 공유한다

```ts
// entities/tax/model/types.ts
export interface TaxDeadline {
  assetClass: AssetClass;
  lastTradeDate: string | null;
  daysRemaining: number | null;
}

export enum AssetClass {
  Crypto = 'crypto',
  KrStock = 'kr_stock',
  UsStock = 'us_stock',
}
```

## 7. Path Alias

| Alias | Target |
|---|---|
| `@/shared` `@/entities` `@/features` `@/widgets` `@/pages` `@/app` | `src/{layer}` |

- **다른 레이어 참조**: 반드시 alias. `../../shared/api` 금지
- **같은 슬라이스 내부**: 상대 경로. `@/entities/tax/model/types` 금지
- alias는 `tsconfig.json`의 `paths`와 번들러 설정 **양쪽에** 넣는다 — 한쪽만 하면 타입 체크와 빌드 중 하나가 깨진다

## 8. 공유 패키지

| 패키지 | 내용 | 소비자 |
|---|---|---|
| `packages/tokens` | 플랫폼 중립 토큰 객체 (순수 TS, CSS 의존 없음) | web · web-tax · mobile |
| `packages/ui` | 웹 컴포넌트 (vanilla-extract) — 공개 subpath 83 | web · web-tax |
| `packages/ui-native` | RN 컴포넌트 | mobile |
| `packages/core` | 플랫폼 무관 `model`·`api`·`lib` | 전부 |
| `packages/eslint-config` `packages/typescript-config` | 툴링 | 전부 |
| `packages/mocks` | MSW 핸들러 | web · web-tax |

## 9. 레이어별 규칙 문서

`fsd-shared.md` · `fsd-entities.md` · `fsd-features.md` · `fsd-widgets.md` · `fsd-pages.md` · `fsd-app.md`
서피스별: `microfrontend.md` · `streaming-ssr.md` · `rn-architecture.md` · `rn-microfrontend.md`
성능: `performance-frontend.md` · `performance-rn.md`

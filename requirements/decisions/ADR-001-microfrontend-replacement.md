# ADR-001 — Module Federation(`nextjs-mf`)을 버리고 Next.js Multi-Zones로 갈아탄다

- 상태: **제안 (사용자 승인 필요)**
- 날짜: 2026-09-09
- 실행 문서: `FE-REQ-007`(MFE 교체) · `FE-REQ-008`(App Router 스트리밍 SSR) · `FE-REQ-009`(FSD 전환) · `RN-REQ-002`(모바일 MFE)
- 규칙: `salt-microFe/.claude/rules/microfrontend.md`(개정) · `streaming-ssr.md`(신규) · `fsd-*.md`(신규)

## 요구 세 개가 동시에 들어왔다

1. 프론트엔드를 **FSD**로 전면 전환한다.
2. **스트리밍 SSR**을 쓴다.
3. **마이크로프론트엔드는 버리지 않고 최신 방식으로 대체한다.** App Router와 스트리밍 SSR이 둘 다 되면서.

추가로 **React Native 모바일 앱**을 `apps/`에 만들고 iOS·Android를 지원한다.

이 문서는 3번에 답한다. **왜 지금 것을 버리는지**와 **왜 그 대안을 골랐는지**가 본문이다.

---

## 1. 왜 지금 것(`@module-federation/nextjs-mf`)을 버리는가

현재 레포는 `@module-federation/nextjs-mf@8.8.11` + `next@^14.2.23` + Pages Router 3앱(`shell` 3000 / `goals` 3001 / `investments` 3002)이다.

버리는 이유는 취향이 아니라 **네 개의 확인된 사실**이다.

### 사실 1 — 공식 문서에 "App Router 미지원"이 명시되어 있다

Module Federation의 Next.js 통합 문서 첫 화면에 **`App Router Not Supported`** 가 박혀 있고, 본문은 Pages Router만 지원한다고 적는다 ([Next.js Integration Overview](https://module-federation.io/integrations/framework/nextjs/)). 공식 예제도 전부 Pages Router다 ([Basic Example](https://module-federation.io/practice/frameworks/next/)).

즉 **요구 2(스트리밍 SSR)와 요구 3(MFE 유지)을 지금 플러그인으로 동시에 만족시키는 방법이 없다.** Next에서 부분 스트리밍은 App Router(RSC + Suspense)의 기능이고, Pages Router의 `getServerSideProps`는 HTML을 한 번에 내려준다.

### 사실 2 — 같은 문서가 "Next.js 지원 종료"를 선언한다

**`Support for Next.js is ending`** — 공식 통합 문서의 문구다 ([같은 문서](https://module-federation.io/integrations/framework/nextjs/), 근거 이슈 `module-federation/core#3153`).

지금 동작하더라도 이 플러그인 위에 새 기능 4개(F001~F004)와 모바일을 올리면, 유지보수가 끝난 빌드 플러그인에 제품 전체가 묶인다. 이건 지금 갈아탈 이유의 절반이다.

### 사실 3 — App Router와 붙이면 빌드가 깨진다 (추측이 아니라 보고된 사례)

- `Compiling RuleSet failed: Expected condition but got falsy value` — Next 14.1 + App Router에서 재현되고, App Router를 빼면 같은 설정이 동작한다 ([core#2122](https://github.com/module-federation/core/issues/2122)).
- App Router 지원 요청은 열려 있는 상태로 남아 있다 ([core#1183](https://github.com/module-federation/core/issues/1183)).
- 근본 원인이 문서화되어 있다: **Next에는 async boundary가 없어서** webpack이 share scope를 조율하는 동안 앱을 "일시 정지"시킬 방법이 없다. 공유(shared) 처리의 구조적 한계다 ([vercel/next.js#33327](https://github.com/vercel/next.js/discussions/33327)).

우회 가능한 설정 문제가 아니라 **번들러와 프레임워크 경계의 문제**다.

### 사실 4 — FSD `pages` 레이어와 Pages Router 디렉터리가 이름부터 충돌한다

FSD는 최상위 레이어를 `shared → entities → features → widgets → pages`로 둔다. 현재 앱은 `src/pages/**`가 곧 라우트다(`apps/investments/src/pages/investment/index.tsx`). `src/pages`를 FSD 레이어로 쓰면 **Next가 그 안의 `ui/`·`model/`·`lib/` 세그먼트를 전부 URL로 잡는다.**

선택지는 둘뿐이다: FSD 레이어 이름을 바꾼다(= 규칙이 번역표가 되고 FSD가 아니게 된다), 또는 라우팅을 `src/app`으로 옮긴다. **후자가 요구 2와 같은 방향이다.**

> 정리: `nextjs-mf`를 유지하면 **FSD와 스트리밍 SSR을 둘 다 포기**해야 하고, 그렇게 해도 지원이 끝난 플러그인에 남는다.

---

## 2. 대안 4개를 실제로 비교했다

| 대안 | App Router | 스트리밍 SSR | 독립 배포 | 상태 | 판정 |
|---|---|---|---|---|---|
| **A. `nextjs-mf` 유지** | ✗ 명시적 미지원 | ✗ | ✓ | **지원 종료 중** | 탈락 (§1) |
| **B. Module Federation 2.0 (`@module-federation/enhanced`) + Rspack** | 실험적 | 실험적 | ✓ | Rspack 2.0의 RSC는 **실험적 저수준 빌드 지원** | 탈락 — 근거 아래 |
| **C. Next.js Multi-Zones (+ `@vercel/microfrontends`)** | **✓ 공식** | **✓ zone별로 그대로** | **✓** | 공식 문서 + Vercel Public Beta | **채택** |
| **D. MFE 폐기, 단일 앱** | ✓ | ✓ | ✗ | — | 탈락 — 요구 3 위반 |

### B를 고르지 않은 이유

Rspack 2.0은 실제로 이 방향에 가장 가깝다. RSC 지시어(`"use client"`, 모듈·함수 레벨 `"use server"`)를 처리하고, 서버·클라이언트 컴포넌트의 스타일을 빌드에서 모아 렌더 시 주입하고, 양쪽 HMR을 지원한다. Module Federation의 `shared`에 **tree shaking**도 붙었다(`lodash-es`에서 `debounce`만 남기는 수준) ([Announcing Rspack 2.0](https://www.rspack.dev/blog/announcing-2-0)).

그런데 같은 발표문이 RSC 지원을 **"실험적 저수준 빌드 지원"** 이라고 적고, 사용 경로가 `rsbuild-plugin-rsc` 또는 수동 설정이다. Next.js와의 관계는 "Next.js가 Rspack을 지원한다"는 언급뿐이고 `next-rspack`의 상태는 명시되지 않는다. stability 선언도 없다.

**정리: 이 조합은 "Next App Router + MF + 스트리밍"을 아직 프레임워크 통합 수준에서 보장하지 않는다.** 사용자 10명짜리 비공개 제품의 빌드 파이프라인을 실험적 조합 위에 올리면, 앞으로 나올 REQ 100여 개의 실패 원인이 전부 빌드 층에서 나온다. 지금 치를 위험이 아니다.

> 다시 볼 조건: `next-rspack`이 안정 선언을 하고 `@module-federation/enhanced`가 App Router를 공식 지원 목록에 올리면, C에서 B로 옮기는 것은 zone 하나를 실험 대상으로 삼아 점진적으로 할 수 있다.

---

## 3. 왜 Next.js Multi-Zones인가

Multi-Zones는 **한 도메인을 여러 Next 앱으로 쪼개는 공식 마이크로프론트엔드 방식**이다. 각 zone은 경로 집합을 담당하는 **평범한 Next 앱**이다 ([Guides: Multi-zones](https://nextjs.org/docs/app/guides/multi-zones)).

### 3-1. 요구 세 개를 동시에 만족시킨다

| 요구 | Multi-Zones가 답하는 방식 |
|---|---|
| **App Router** | zone이 평범한 Next 앱이므로 App Router를 그냥 쓴다. 공식 문서가 App Router 가이드로 제공되고, App Router 예제 레포가 있다 ([vercel-labs/microfrontends-nextjs-app-multi-zone](https://github.com/vercel-labs/microfrontends-nextjs-app-multi-zone)) |
| **스트리밍 SSR** | 번들러 층에서 조립하지 않으므로 **각 zone이 자기 RSC·Suspense 스트리밍을 온전히 갖는다.** 이게 §1 사실 3의 "async boundary 없음" 문제를 피하는 구조적 이유다 |
| **독립 배포** | zone마다 독립 배포. 프레임워크·버전도 zone별로 다르게 갈 수 있다 |

### 3-2. 조립 지점이 빌드가 아니라 라우팅이다 — 이것이 핵심 차이

Module Federation은 **런타임에 번들을 합친다.** 그래서 share scope, 버전 정렬, async boundary가 문제가 된다.

Multi-Zones는 **HTTP 경로를 프록시로 나눈다.** 조립이 요청 라우팅에서 일어나므로 번들러가 서로를 알 필요가 없다.

```js
// zone: assetPrefix로 정적 자산 충돌을 피한다
// next.config.js (tax zone)
const nextConfig = { assetPrefix: '/tax-static' }

// default zone: rewrites로 경로를 zone에 보낸다
async rewrites() {
  return [
    { source: '/tax',            destination: `${process.env.TAX_DOMAIN}/tax` },
    { source: '/tax/:path+',     destination: `${process.env.TAX_DOMAIN}/tax/:path+` },
    { source: '/tax-static/:path+', destination: `${process.env.TAX_DOMAIN}/tax-static/:path+` },
  ]
}
```

Next.js 15+에서는 정적 자산용 추가 rewrite가 불필요하다(문서 명시).

### 3-3. 대가 — zone 간 이동은 hard navigation이다

같은 zone 안 이동은 soft navigation이고, **zone을 넘으면 리소스를 내리고 다시 받는다.** 공식 문서의 지침이 명확하다: *"자주 함께 방문되는 페이지는 같은 zone에 둔다."* zone 간 링크는 `<Link>`가 아니라 `<a>`를 써야 한다(prefetch가 동작하지 않으므로).

**이 대가가 zone 경계를 정하는 유일한 기준이다.** 아래 3-4가 그 적용이다.

Vercel에 배포하는 경우에는 `@vercel/microfrontends`가 이 대가를 줄인다 — 루트 `layout.tsx`에 `PrefetchCrossZoneLinksProvider`를 넣고 확장된 `Link`를 쓰면 **zone 간 링크를 prefetch·prerender해서 리로드 없이 전환**한다. 라우팅은 Vercel 네트워크가 처리한다 ([Vercel Microfrontends](https://vercel.com/docs/microfrontends), Public Beta).

### 3-4. SALT의 zone 경계 — 탭으로 자르지 않는다

3탭 IA(`홈` / `코치` / `자산`)를 그대로 zone 3개로 자르면 **탭 전환마다 full reload**가 된다. 탭 전환은 이 제품에서 가장 잦은 이동이다. 그래서 자르지 않는다.

zone은 **방문 빈도와 릴리스 주기**로 자른다.

| zone | 경로 | 담는 것 | 왜 별도 zone인가 |
|---|---|---|---|
| `apps/web` (default) | `/`, `/coach/*`, `/assets/*` | 홈 · 코치 대화 · 포지션 · 청구서 | 3탭이 전부 여기 있다. 탭 전환이 **soft navigation**이 된다 |
| `apps/web-tax` | `/tax/*` | 세금 마감 콕핏 (F002) | ① 방문 빈도가 낮다 — 연말과 신고 기간에 쓴다. ② **릴리스 주기가 완전히 다르다** — 법령 파라미터(시행일·세율·공제·기준일)가 바뀌면 이 zone만 배포한다. ③ 세금 계산 코드·솔버·환율 로직이 다른 화면에 실려 갈 이유가 없다 |

- **초기 zone은 2개다.** MFE의 값을 실제로 회수하는 경계가 지금은 이것 하나다.
- zone을 늘리는 기준을 규칙에 못 박는다: **① 다른 zone과 릴리스 주기가 다르고 ② 사용자가 다른 zone과 자주 오가지 않고 ③ 번들에 실려 갈 이유가 없는 무거운 코드를 갖는다.** 세 개를 다 만족해야 zone이 된다.
- 세금 zone은 홈의 `세금 D-Day` 한 줄에서 진입한다. 그 링크는 `<a>`로 두고, Vercel 배포 시에만 cross-zone prefetch로 완화한다.

### 3-5. 코드 공유는 monorepo가 한다

Multi-Zones는 코드 공유 수단을 제공하지 않는다 — **monorepo 또는 npm 패키지로 공유하라**고 문서가 말한다. 우리는 이미 pnpm workspace(`apps/*`, `packages/*`)와 turbo가 있으므로 그대로 쓴다.

| 패키지 | 내용 | 소비자 |
|---|---|---|
| `packages/tokens` | **신규.** 플랫폼 중립 토큰 객체(순수 TS) | web · web-tax · mobile |
| `packages/ui` | 웹 컴포넌트 (vanilla-extract). `feature/repo-ui-component`의 44종 유지 | web · web-tax |
| `packages/ui-native` | **신규.** RN 컴포넌트 | mobile |
| `packages/core` | **신규.** FSD `entities`/`features`의 `model`·`api`·`lib` 중 플랫폼 무관한 것 | web · web-tax · mobile |
| `packages/message-event-bus` | **제거 대상.** zone 간 통신은 URL과 서버 상태로 한다 | — |

`packages/tokens`가 필요한 이유: 현재 토큰은 `createGlobalTheme`(vanilla-extract) 호출이라 **RN에서 import가 불가능하다.** 값을 순수 객체로 빼고, 웹은 그 값으로 `createGlobalTheme`을 만들고 RN은 `StyleSheet`를 만든다.

### 3-6. Server Actions 주의

한 도메인이 여러 앱을 서비스하므로 Server Actions를 쓰면 origin을 명시해야 한다.

```js
const nextConfig = {
  experimental: { serverActions: { allowedOrigins: ['salt.example.com'] } },
}
```

---

## 4. 모바일 MFE는 다른 방식이다 — 토스형 번들 분리

웹의 MFE 문제는 "한 도메인을 여러 배포로 쪼개기"이고, 모바일의 문제는 **"스토어 심사를 우회해서 화면을 배포하기"** 다. 문제가 다르므로 방식도 다르다.

토스의 React Native 운영 방식을 근거로 삼는다 ([toss.tech, 2024](https://toss.tech/article/react-native-2024)).

| 항목 | 내용 |
|---|---|
| 번들 분리 | **Shared Bundle**(react-native 등 네이티브 결합 코드, 모든 서비스 공유) + **Service Bundle**(서비스별 코드, 실행 시 필요한 것만 동적 로드) |
| 번들러 | Metro 대신 **ESBuild**. Metro는 빌드가 느리고 **tree-shaking을 지원하지 않고** 캐시를 리셋하지 않으면 일관성이 보장되지 않는다. ESBuild로 **빌드 1분 이내** |
| 배포 | 정적 JS 1개를 빌드·업로드 → 어드민에서 **1초 배포**. CDN 경유 |
| 카나리 | **1~100% 임의 사용자 그룹**에 부분 배포 |
| 성능 | 파일시스템에서 JS를 읽으므로 WebView의 네트워크 로딩이 사라진다. 실제 화면에서 **1초 이상 로딩 감축**. **Hermes** 사전 컴파일로 초기 로딩 추가 개선 |
| 복잡도 | SSR의 universal 코드(서버·클라이언트 양쪽 고려)가 없어지고 **클라이언트만** 고려한다 |

SALT의 서비스 번들 경계는 웹 zone 경계와 같은 기준을 쓴다: `coach` · `assets` · `tax` · `plan`. 상세는 `RN-REQ-002`.

---

## 5. 결정

| 서피스 | 방법론 | 라우팅 | 마이크로프론트엔드 | 스트리밍 |
|---|---|---|---|---|
| `apps/web` (default zone) | **FSD** | Next.js **App Router** | **Multi-Zones** | RSC + Suspense |
| `apps/web-tax` (zone) | **FSD** | Next.js App Router | **Multi-Zones** | RSC + Suspense |
| `apps/mobile` | **FSD** | React Native (Expo prebuild, iOS+Android) | **Shared/Service 번들** | SSE 소비 |
| `bff` | 레이어드 | Express | 해당 없음 | **SSE 송신** |
| `salt-server` | **DDD** (컨텍스트 우선) | Express | 해당 없음 | LLM 토큰 스트림 |

실행 항목:

1. `@module-federation/nextjs-mf` 제거. `apps/shell` + `apps/investments` + `apps/goals` → `apps/web` 하나로 통합.
2. `apps/web-tax` zone 신설. `assetPrefix: '/tax-static'` + default zone의 `rewrites`.
3. 라우팅을 `src/app`(App Router)으로 이관. FSD 레이어는 `src/{shared,entities,features,widgets,pages}`.
4. `packages/tokens` 추출 → `packages/ui`(웹)와 `packages/ui-native`(RN)가 그것을 소비.
5. `packages/message-event-bus` 제거.
6. `feature/repo-ui-component` 브랜치 병합이 선행 — `@repo/ui` 44종(공개 subpath 83개)을 웹에서 그대로 쓴다.

## 6. 버리는 것과 그 값

| 버리는 것 | 잃는 값 | 판단 |
|---|---|---|
| `nextjs-mf` 런타임 조립 | 앱 3개가 **한 페이지 안에서** 컴포넌트 단위로 섞이는 능력 | 실제로 쓰던 방식이 아니다. `shell`이 remote 페이지를 통째로 마운트했다 — 그건 Multi-Zones가 경로 단위로 하는 일과 같다 |
| remote 3앱 구조 | 앱별 독립 배포 | **zone별 독립 배포로 대체된다.** 경계만 3개 → 2개로 재정의 |
| `message-event-bus` | 앱 간 이벤트 통신 | zone 간 통신은 URL·서버 상태로 한다. `ACCOUNT_SELECTED`는 이미 코드에 없다(grep 0건) |
| Pages Router 라우트 파일 | — | 라우트 수가 적다(홈·목표·투자). App Router로 1:1 이관 |

## 7. Open Questions

- **배포 대상이 Vercel인가.** `@vercel/microfrontends`의 cross-zone prefetch와 라우팅은 Vercel 네트워크 기능이다(Public Beta). 자체 호스팅이면 순수 Multi-Zones + 자체 프록시(rewrites 또는 nginx)이고 **zone 간 이동은 hard navigation으로 남는다.** → `FE-REQ-007`에서 확정.
- **SSR이 정말 필요한가.** 비공개·초대제·≤10명이면 SEO도 첫 방문 압박도 약하다. 스트리밍의 실제 값은 코치 대화 응답을 흘리는 것인데 그건 **SSE + 클라이언트 렌더**로도 된다. 스트리밍 SSR을 쓸 자리가 그 하나뿐이면 App Router 전환의 값이 줄어든다(단, FSD 충돌 해소는 그것만으로도 이유가 된다). → `FE-REQ-008`에서 두 방식을 측정 비교.
- `apps/goals`를 `apps/web`의 FSD 슬라이스로 이관할지, 기능을 접을지. FEATURE-000이 목표 저축 UI를 변경 금지 목록에 넣었으므로 **이관**이 기본.
- 웹과 RN이 화면 로직을 두 번 구현한다. `packages/core`로 올릴 범위를 어디까지 할지 → `RN-REQ-001`.
- **사용자 승인 대기**: `nextjs-mf` 제거와 3앱 → 2 zone 통합은 되돌리기 비용이 큰 결정이다.

## 8. 출처

- [Next.js Integration Overview — Module Federation](https://module-federation.io/integrations/framework/nextjs/) — "App Router Not Supported", "Support for Next.js is ending"
- [Basic Example — Next.js & Module Federation](https://module-federation.io/practice/frameworks/next/)
- [module-federation/core#2122](https://github.com/module-federation/core/issues/2122) — App Router 컴파일 실패
- [module-federation/core#1183](https://github.com/module-federation/core/issues/1183) — App Router 지원 이슈
- [vercel/next.js#33327](https://github.com/vercel/next.js/discussions/33327) — async boundary 부재로 인한 share scope 한계
- [Guides: Multi-zones — Next.js](https://nextjs.org/docs/app/guides/multi-zones)
- [vercel-labs/microfrontends-nextjs-app-multi-zone](https://github.com/vercel-labs/microfrontends-nextjs-app-multi-zone) — App Router 예제
- [Vercel Microfrontends](https://vercel.com/docs/microfrontends) · [Public Beta 공지](https://vercel.com/changelog/microfrontends-support-is-now-in-public-beta)
- [Announcing Rspack 2.0](https://www.rspack.dev/blog/announcing-2-0) — RSC 실험적 지원, MF shared tree shaking
- [토스 — React Native 2024](https://toss.tech/article/react-native-2024) — Shared/Service 번들, ESBuild, 1초 배포, 카나리, Hermes

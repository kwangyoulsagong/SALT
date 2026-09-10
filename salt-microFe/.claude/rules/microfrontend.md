# 마이크로프론트엔드 — Next.js Multi-Zones

> **개정 2026-09-09.** `@module-federation/nextjs-mf`를 버리고 Multi-Zones로 갈아탔다. 근거는 `requirements/decisions/ADR-001-microfrontend-replacement.md`와 `FE-REQ-007`에 있다. 요약: 공식 문서에 **`App Router Not Supported`** 와 **`Support for Next.js is ending`** 이 명시되어 있고, App Router와 붙이면 빌드가 깨진다(원인: Next에 async boundary가 없어 share scope 조율 중 앱을 멈출 수 없다).

## 1. zone이란

zone은 **경로 집합을 담당하는 평범한 Next 앱**이다. 조립이 번들러가 아니라 **요청 라우팅**에서 일어난다. 그래서 각 zone이 자기 App Router·RSC·스트리밍을 온전히 갖는다.

| zone | 앱 | 경로 | 왜 별도인가 |
|---|---|---|---|
| default | `apps/web` | `/`, `/coach/*`, `/assets/*`, `/goals/*` | 3탭이 전부 여기 있다. **탭 전환이 soft navigation이 된다** |
| tax | `apps/web-tax` | `/tax/*` | ① 방문 빈도가 낮다(연말·5월) ② **릴리스 이유가 다르다** — 법령 파라미터 변경 ③ 취득가액 lot 엔진·손실수확 솔버·환율 로직이 매일 쓰는 번들에 실릴 이유가 없다 |

## 2. zone을 추가하는 기준 — 세 조건을 모두 만족해야 한다

1. 다른 zone과 **릴리스 주기가 다르다**
2. 사용자가 다른 zone과 **자주 오가지 않는다**
3. 다른 zone 번들에 실려 갈 이유가 없는 **무거운 코드**를 갖는다

하나라도 불확실하면 **같은 zone의 FSD 슬라이스**로 만든다. zone은 되돌리기가 비싸다.

**탭 경계로 zone을 자르지 않는다.** 탭 전환은 이 제품에서 가장 잦은 이동이고, zone을 넘으면 full reload가 된다.

## 3. 설정

```js
// apps/web-tax/next.config.js
const nextConfig = { assetPrefix: '/tax-static' };
```

```js
// apps/web/next.config.js  (default zone 이 프록시 역할)
async rewrites() {
  const tax = process.env.TAX_ZONE_ORIGIN;   // scheme + 도메인 포함 절대 URL
  return [
    { source: '/tax',                 destination: `${tax}/tax` },
    { source: '/tax/:path+',          destination: `${tax}/tax/:path+` },
    { source: '/tax-static/:path+',   destination: `${tax}/tax-static/:path+` },
  ];
}
```

- default zone은 `assetPrefix`를 갖지 않는다.
- Next 15+에서는 정적 자산용 추가 rewrite가 불필요하다. **그 우회를 코드에 남기지 않는다.**
- 로컬 개발에서는 `TAX_ZONE_ORIGIN`이 `http://localhost:3001`을 가리킨다.
- **경로는 zone 간 유일해야 한다.** 두 zone이 같은 경로를 서비스하면 라우팅 충돌이다.

## 4. zone 간 링크는 `<a>`다

`<Link>`는 상대 경로를 prefetch·soft navigate하려 하고 **zone을 넘으면 동작하지 않는다.**

```tsx
// ✅ zone 을 넘는다
<a href="/tax">세금 마감 콕핏</a>

// ❌ 깨진다
<Link href="/tax">세금 마감 콕핏</Link>
```

- zone 경로 목록은 `shared/config`에 둔다. 어떤 경로가 다른 zone인지 한 곳에서 안다.
- **ESLint 규칙으로 강제한다** — zone 경로에 `<Link>`를 쓰면 lint 실패.
- zone 진입 링크에는 **로딩 상태를 준다.** hard navigation이므로 체감 지연이 있다.

## 5. Vercel 배포 시 완화

Vercel에 배포하면 `@vercel/microfrontends`가 cross-zone 이동을 부드럽게 만든다.

- 루트 `layout.tsx`에 `PrefetchCrossZoneLinksProvider`
- 확장된 `Link`로 zone 간 prefetch·prerender → 리로드 없는 전환
- 라우팅은 Vercel 네트워크가 처리 (Public Beta)

**자체 호스팅이면 이 완화가 없다.** 순수 Multi-Zones + 자체 프록시(default zone `rewrites` 또는 nginx)이고 zone 간 hard navigation을 그대로 안는다.

## 6. Server Actions

한 도메인이 여러 앱을 서비스하므로 origin을 명시해야 한다.

```js
experimental: { serverActions: { allowedOrigins: ['salt.example.com'] } }
```

## 7. 코드 공유

Multi-Zones는 코드 공유 수단을 제공하지 않는다. **workspace 패키지로만** 공유한다.

- `apps/web-tax`가 `apps/web/src/**`를 직접 import하는 것은 **훅이 차단**한다.
- 공유 대상은 `packages/tokens` · `packages/ui` · `packages/core`.
- zone별 릴리스가 어긋날 수 있으므로 **zone을 넘나드는 기능은 기능 플래그로 동시 활성화**한다.

## 8. 하지 않는 것

- **`@module-federation/nextjs-mf`를 다시 넣지 않는다.** 지원이 종료되고 App Router에서 동작하지 않는다.
- **`packages/message-event-bus`를 쓰지 않는다.** 제거됐다. zone 간 통신은 URL 파라미터와 서버 상태로 한다.
- **런타임 번들 조립(Module Federation)을 다시 도입하기 전에** `next-rspack` 안정 선언과 `@module-federation/enhanced`의 App Router 공식 지원을 확인한다. 그때는 `web-tax` zone 하나를 실험 대상으로 삼는다 — Multi-Zones가 그 실험을 zone 단위로 격리해 준다.

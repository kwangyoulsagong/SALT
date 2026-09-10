---
id: FE-REQ-007
area: fe
kind: ARCH
title: "마이크로프론트엔드 교체 — Module Federation(nextjs-mf) → Next.js Multi-Zones"
priority: critical
labels: [architecture, microfrontend, multi-zones, app-router, migration]
created: 2026-09-09
decision: requirements/decisions/ADR-001-microfrontend-replacement.md
---

## Summary

`@module-federation/nextjs-mf`를 제거하고 **Next.js Multi-Zones**로 갈아탄다. 앱 3개(`shell`·`goals`·`investments`)를 **zone 2개**(`apps/web` · `apps/web-tax`)로 재편한다. 마이크로프론트엔드를 포기하는 것이 아니라, **App Router와 스트리밍 SSR이 동작하는 방식으로 옮기는 것**이다.

## 왜 지금 것을 버리는가 — 확인된 사실 4개

취향이 아니다. 각 항목에 출처가 있다.

### 사실 1 — 공식 문서에 "App Router 미지원"이 박혀 있다

Module Federation의 Next.js 통합 문서 상단에 **`App Router Not Supported`**, 본문에 Pages Router만 지원한다고 적혀 있다 ([Integration Overview](https://module-federation.io/integrations/framework/nextjs/)). 공식 예제도 전부 Pages Router다 ([Basic Example](https://module-federation.io/practice/frameworks/next/)).

→ **스트리밍 SSR(요구)과 MFE 유지(요구)를 지금 플러그인으로 동시에 만족시킬 방법이 없다.** Next에서 부분 스트리밍은 App Router(RSC + Suspense)의 기능이고 Pages Router의 `getServerSideProps`는 HTML을 한 번에 내린다.

### 사실 2 — 같은 문서가 "Next.js 지원 종료"를 선언한다

**`Support for Next.js is ending`** ([같은 문서](https://module-federation.io/integrations/framework/nextjs/), 근거 이슈 `module-federation/core#3153`).

→ 지금 동작해도, 앞으로 올릴 REQ 100여 개와 모바일 앱이 **유지보수가 끝난 빌드 플러그인**에 묶인다.

### 사실 3 — App Router와 붙이면 빌드가 깨진다 (보고된 사례)

- `Compiling RuleSet failed: Expected condition but got falsy value` — Next 14.1 + App Router에서 재현. App Router를 빼면 같은 설정이 동작한다 ([core#2122](https://github.com/module-federation/core/issues/2122)).
- App Router 지원 요청은 미해결 상태다 ([core#1183](https://github.com/module-federation/core/issues/1183)).
- 근본 원인: **Next에 async boundary가 없어서** webpack이 share scope를 조율하는 동안 앱을 "일시 정지"시킬 수 없다 ([vercel/next.js#33327](https://github.com/vercel/next.js/discussions/33327)).

→ 설정으로 우회할 문제가 아니라 **번들러와 프레임워크 경계의 문제**다.

### 사실 4 — Pages Router에 남으면 스트리밍 화면 설계를 손으로 만들어야 한다

Pages Router의 `getServerSideProps`는 **HTML을 한 번에** 내려준다. 부분 스트리밍이 없다. 홈 5블록·세금 콕핏·청구서처럼 **소스가 여럿이고 지연이 제각각인 화면**이 가장 느린 소스에 묶인다(상세: `FE-REQ-008`).

> **정정 기록.** 이 자리에 처음에는 "FSD `pages` 레이어와 Next `src/pages`가 충돌하므로 App Router로 가야 한다"고 적었다. **틀렸다.** FSD 공식 Next.js 가이드는 **라우팅 디렉터리를 프로젝트 루트에 두고 FSD를 `src/`에 두는 방식**으로 이 충돌을 해결하며, 이는 Pages Router와 App Router **둘 다에 적용된다**([FSD — Next.js와 함께 사용하기](https://feature-sliced.design/kr/docs/guides/tech/with-nextjs)). 즉 FSD는 App Router 전환의 근거가 아니다. App Router의 근거는 **스트리밍 하나**이고, `nextjs-mf` 교체의 근거는 사실 1~3이다.

> **한 줄: `nextjs-mf`를 유지하면 스트리밍 SSR을 포기해야 하고, 그러고도 지원이 끝난 플러그인에 남는다.**

---

## 후보 5개를 비교했다

| | A. `nextjs-mf` 유지 | B. MF 2.0 + Rspack | **C. Multi-Zones** | D. Vite + MF | E. MFE 폐기 |
|---|---|---|---|---|---|
| App Router | ✗ 명시적 미지원 | 실험적 | **✓ 공식** | 해당 없음(Next 이탈) | ✓ |
| 스트리밍 SSR | ✗ | 실험적 | **✓ zone별로 온전히** | 직접 구현 | ✓ |
| 독립 배포 | ✓ | ✓ | **✓ zone 단위** | ✓ | ✗ |
| 조립 지점 | 런타임 번들 | 런타임 번들 | **요청 라우팅** | 런타임 번들 | 없음 |
| 유지보수 상태 | **지원 종료 중** | 진화 중, stability 선언 없음 | **공식 문서 + Vercel Public Beta** | 안정 | — |
| 지금 코드 보존 | 전부 | 빌드 설정 재작성 | **라우트 이관만** | 전면 재작성 | 라우트 이관 |
| 학습·운영 비용 | 낮음(이미 씀) | 높음 | **낮음 — `assetPrefix` + `rewrites`뿐** | 높음(SSR 자작) | 가장 낮음 |

### A를 버린 이유
사실 1~4. **스트리밍 SSR을 원천적으로 못 하고, 지원이 종료되는 플러그인에 제품 전체가 묶인다.**

### B를 버린 이유 — 가장 아까웠던 후보

Rspack 2.0은 이 방향에 가장 가깝다. RSC 지시어(`"use client"`, 모듈·함수 레벨 `"use server"`)를 처리하고, 서버·클라이언트 컴포넌트 스타일을 빌드에서 모아 렌더 시 주입하고, 양쪽 HMR을 지원한다. Module Federation `shared`에 **export 레벨 tree shaking**도 붙었다(`lodash-es`에서 `debounce`만 남기는 수준). 빌드도 빠르다 — 10k 벤치에서 프로덕션 캐시 적용 1.4초, 메모리 20% 감소 ([Announcing Rspack 2.0](https://www.rspack.dev/blog/announcing-2-0)).

**안 되는 것:** 같은 발표문이 RSC 지원을 **"실험적 저수준 빌드 지원"** 이라고 적는다. 사용 경로가 `rsbuild-plugin-rsc` 또는 수동 설정이고, Next.js와의 관계는 "Next.js가 Rspack을 지원한다"는 언급뿐 `next-rspack`의 상태가 명시되지 않는다. stability 선언이 없다.

**우리에게 안 맞은 이유:** 우리는 지금부터 **REQ 100여 개와 모바일 앱**을 올린다. 그 전부의 실패 원인이 빌드 층에서 나올 수 있는 조합을 기반으로 깔 수 없다. 우리 조직은 빌드 툴체인 전담이 없다(토스는 RN 플랫폼 팀이 4명이다). **실험적 조합을 감당할 인력이 없다는 것이 결정적이었다.**

> 다시 볼 조건: `next-rspack` 안정 선언 + `@module-federation/enhanced`의 App Router 공식 지원. 그때는 `web-tax` zone 하나를 실험 대상으로 삼아 점진적으로 옮길 수 있다 — **Multi-Zones가 그 실험을 zone 단위로 격리해 준다는 것도 C의 장점이다.**

### D를 버린 이유
Vite + `@module-federation/vite`는 안정적으로 동작한다. 하지만 **Next를 떠나면 SSR·이미지 최적화·라우팅을 직접 만들어야 한다.** 이 제품은 비공개·초대제라 SEO 요구가 없고, SSR을 자작해서 얻을 것이 없다. 이미 있는 Next 자산(라우팅·번들·이미지)을 버리는 비용만 남는다.

### E를 버린 이유
요구 위반이다. 사용자가 **"모듈 페더레이션 그럼 최신방식으로 대체"** 를 명시했다. 또한 §"우리에게 C가 맞은 이유" 3번의 값(세금 zone 독립 릴리스)이 실재한다.

---

## 왜 C가 **우리에게** 맞았는가 — 네 가지 구체적 이유

일반적인 장단점이 아니라 **SALT의 제약에 비춘 근거**다.

### 이유 1 — 조립이 빌드가 아니라 라우팅에서 일어난다

Module Federation은 **런타임에 번들을 합친다.** 그래서 share scope·버전 정렬·async boundary가 문제가 된다(사실 3).

Multi-Zones는 **HTTP 경로를 프록시로 나눈다.** zone은 그냥 평범한 Next 앱이다. 번들러가 서로를 알 필요가 없으므로 **각 zone이 자기 RSC·Suspense 스트리밍을 온전히 갖는다.** 요구 두 개가 서로를 막지 않게 되는 구조적 이유가 이것이다.

### 이유 2 — 우리가 MFE를 쓰던 방식이 이미 Multi-Zones와 같았다

현재 `shell`은 remote의 **페이지를 통째로 마운트**한다(`apps/shell/src/pages/investments`, `components/Remote`). 한 페이지 안에서 컴포넌트 단위로 섞은 적이 없다.

즉 **런타임 번들 조립이라는 비싼 능력을 사고, 경로 단위 분리라는 싼 기능만 쓰고 있었다.** Multi-Zones로 옮기면 실제로 쓰던 것은 그대로 남고 안 쓰던 비용만 사라진다. **잃는 기능이 없다는 것이 확인된 것**이 판단의 핵심이었다.

### 이유 3 — 우리에게 zone 경계가 실제로 하나 있다: 세금

세금 콕핏(F002)은 다른 화면과 성질이 다르다.

| | 세금 콕핏 | 나머지 화면 |
|---|---|---|
| 방문 빈도 | 연말 + 신고 기간(5월) | 매일 |
| 릴리스 이유 | **법령 파라미터 변경** (시행일·세율·공제·기준일·거래세율) | 기능 추가 |
| 코드 무게 | 취득가액 lot 엔진 · 손실수확 솔버 · 환율 함정 탐지 · 결제 캘린더 | — |

법령이 바뀌면(국회 재유예·폐지 논의가 진행 중이다) **세금 zone만 배포**하면 된다. 반대로 세금 솔버 코드가 매일 쓰는 홈·코치 번들에 실려 갈 이유가 없다.

**"MFE가 필요한가"에 대한 우리 답이 여기서 나왔다. 하나는 필요하다.**

### 이유 4 — 탭으로 zone을 자르지 않으면 대가를 안 치른다

Multi-Zones의 대가는 **zone 간 이동이 hard navigation**이라는 것이다(리소스를 내리고 다시 받는다. zone 간 링크는 `<Link>`가 아니라 `<a>`). 공식 지침이 *"자주 함께 방문되는 페이지는 같은 zone에 둔다"* 다.

3탭 IA(`홈`/`코치`/`자산`)를 zone 3개로 자르면 **탭 전환마다 full reload**가 된다 — 이 제품에서 가장 잦은 이동이다. 그래서 **탭 경계로 자르지 않는다.** 3탭은 전부 `apps/web` 한 zone에 두고 soft navigation을 유지한다.

세금은 홈의 `세금 D-Day` 한 줄에서 진입하고 방문 빈도가 낮으므로, 그 한 번의 hard navigation은 **치를 만한 대가**다.

→ **대가를 회피할 수 있는 경계가 우리 IA에 이미 있었다는 것**이 마지막 근거다.

---

## Requirements

### A. zone 구성

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | `apps/shell` + `apps/investments` + `apps/goals`를 **`apps/web`** 하나로 통합한다. 이것이 default zone이며 `assetPrefix`를 갖지 않는다 | Must |
| FR-2 | **`apps/web-tax`** zone을 신설한다. `assetPrefix: '/tax-static'`. 담당 경로는 `/tax/*` | Must |
| FR-3 | default zone의 `next.config.js`에 `rewrites`로 `/tax`, `/tax/:path+`, `/tax-static/:path+`를 세금 zone 도메인으로 보낸다. `destination`은 scheme+도메인을 포함한 절대 URL이며 환경변수(`TAX_ZONE_ORIGIN`)로 주입한다 | Must |
| FR-4 | zone 간 경로는 **유일**해야 한다. 두 zone이 같은 경로를 서비스하지 않는다 | Must |
| FR-5 | zone 간 링크는 `<a>`를 쓴다. `<Link>`를 쓰면 prefetch·soft navigation이 동작하지 않는다. **ESLint 규칙으로 강제**한다 (`no-restricted-imports`가 아니라 zone 경로 목록 기반 커스텀 규칙) | Must |
| FR-6 | `@module-federation/nextjs-mf` 의존성과 모든 `NextFederationPlugin` 설정을 제거한다 | Must |
| FR-7 | `packages/message-event-bus`를 제거한다. zone 간 통신은 **URL 파라미터와 서버 상태**로 한다 | Must |
| FR-8 | Next.js 15+로 올린다. 15 미만에서는 정적 자산용 추가 rewrite가 필요하다(공식 문서 명시) — 그 우회를 코드에 남기지 않는다 | Must |

### B. zone 추가 기준 (규칙으로 못 박는다)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 새 zone은 **세 조건을 모두** 만족해야 한다: ① 다른 zone과 릴리스 주기가 다르다 ② 사용자가 다른 zone과 자주 오가지 않는다 ③ 다른 zone 번들에 실려 갈 이유가 없는 무거운 코드를 갖는다 | Must |
| FR-11 | 세 조건 중 하나라도 불확실하면 **같은 zone의 FSD 슬라이스**로 만든다. zone은 되돌리기가 비싸다 | Must |
| FR-12 | zone 목록과 각 zone의 근거를 `salt-microFe/.claude/rules/microfrontend.md`에 표로 유지한다 | Must |

### C. 배포와 cross-zone 완화

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 배포 대상을 확정한다. **Vercel이면** `@vercel/microfrontends`를 도입해 루트 `layout.tsx`에 `PrefetchCrossZoneLinksProvider`를 넣고 확장 `Link`로 cross-zone prefetch·prerender를 켠다 | Must |
| FR-21 | **자체 호스팅이면** 순수 Multi-Zones + 자체 프록시(default zone의 `rewrites` 또는 nginx)로 하고, **zone 간 hard navigation을 그대로 안는다.** 그 사실을 규칙에 적고 세금 진입 링크에 로딩 상태를 준다 | Must |
| FR-22 | 로컬 개발에서 `rewrites`의 `destination`이 `localhost:<port>`를 가리키게 한다. `pnpm dev`가 두 zone을 동시에 띄운다 | Must |
| FR-23 | Server Actions를 쓰면 `experimental.serverActions.allowedOrigins`에 사용자 대면 도메인을 명시한다. 한 도메인이 여러 앱을 서비스하므로 필수다 | Must |
| FR-24 | zone별 릴리스가 어긋날 수 있으므로, zone을 넘나드는 기능은 **기능 플래그**로 동시 활성화한다 | Should |

### D. 공유 코드

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | `packages/tokens` 신규 — 플랫폼 중립 토큰 객체(순수 TS). 현재 토큰은 `createGlobalTheme` 호출이라 **RN에서 import가 불가능**하다. 값을 객체로 빼고 웹은 그것으로 `createGlobalTheme`을, RN은 `StyleSheet`를 만든다 | Must |
| FR-31 | `packages/ui`는 **웹 전용**으로 유지한다. `feature/repo-ui-component` 브랜치의 44종(공개 subpath 83개)을 병합해 그대로 쓴다. **병합이 이 REQ의 선행이다** | Must |
| FR-32 | `packages/core` 신규 — FSD `entities`/`features`의 `model`·`api`·`lib` 중 플랫폼 무관한 것. 두 zone과 RN이 공유한다 | Should |
| FR-33 | zone 간 코드 공유는 **workspace 패키지로만** 한다. `apps/web-tax`가 `apps/web/src/**`를 직접 import하지 않는다 | Must |

## Non-Functional

| 구분 | 요구사항 |
|---|---|
| 성능 | zone 내부 이동은 soft navigation(리로드 없음). default zone 첫 페인트 예산은 `performance-frontend.md` 참조. **세금 zone 진입 1회의 hard navigation은 예산에서 제외**하고 별도 측정한다 |
| 빌드 | `turbo build`가 zone 2개를 빌드한다. turbo 캐시 outputs를 `.next/**`로 유지 |
| 되돌리기 | `nextjs-mf` 제거는 커밋 하나로 되돌릴 수 있게 **단일 커밋**으로 한다. 앱 통합은 별도 커밋 |
| 관측성 | zone별 첫 페인트, cross-zone 이동 횟수, `rewrites` 프록시 지연을 측정한다 |

## Acceptance Criteria

- [ ] `apps/` 아래에 `web`, `web-tax`, `mobile` 셋만 있다 (`shell`·`goals`·`investments` 없음)
- [ ] `grep -rn "nextjs-mf\|NextFederationPlugin" salt-microFe --include="*.ts" --include="*.js" --include="*.json"` = 0 (node_modules 제외)
- [ ] `grep -rn "message-event-bus" salt-microFe/apps` = 0
- [ ] `/tax`로 접근하면 세금 zone이 응답하고, 정적 자산이 `/tax-static/_next/...`로 서비스된다
- [ ] `/`에서 `/coach`, `/assets`로 이동할 때 **full reload가 발생하지 않는다** (Performance 패널로 확인)
- [ ] `/`에서 `/tax`로 이동할 때 hard navigation이고, 그 링크가 `<a>`다
- [ ] zone 간 경로 중복이 0건이다
- [ ] `packages/tokens`가 존재하고 `@vanilla-extract/css`를 import하지 않는다
- [ ] `apps/web-tax`가 `apps/web/src/**`를 import하지 않는다
- [ ] `pnpm build`가 zone 2개 + `packages/*`를 통과한다
- [ ] `pnpm dev`가 두 zone을 동시에 띄우고 `/tax`가 로컬에서 프록시된다
- [ ] zone 목록·근거 표가 `microfrontend.md`에 있다

## Trace

| FR | 산출물 | 검증 |
|---|---|---|
| FR-1~2 | `apps/web`, `apps/web-tax` | 디렉터리 존재 + 빌드 |
| FR-3~4 | `apps/web/next.config.js` `rewrites` | `/tax` 응답 확인 |
| FR-5 | ESLint 커스텀 규칙 | zone 경로에 `<Link>` 사용 시 lint 실패 |
| FR-6~7 | `package.json`, 설정 파일 | grep 0 |
| FR-8 | `next@^15` | `next --version` |
| FR-10~12 | `microfrontend.md` | 규칙 표 존재 |
| FR-20~24 | 배포 설정 | cross-zone 이동 측정 |
| FR-30~33 | `packages/tokens`, `core` | import 그래프 확인 |

## Dependencies

- **선행:** `feature/repo-ui-component` 브랜치 병합 (`@repo/ui` 44종)
- **후속:** `FE-REQ-008`(App Router 스트리밍) → `FE-REQ-009`(FSD 전환). 순서를 바꾸면 라우트를 두 번 옮긴다
- **연동:** `RN-REQ-001`이 `packages/tokens`를 소비한다 (FR-30 공동 선행)
- **영향 없음:** `bff/**`, `salt-server/**` — 이 REQ는 프론트 배포 구조만 바꾼다

## Open Questions

- **배포 대상이 Vercel인가.** FR-20/FR-21이 갈린다. `@vercel/microfrontends`의 cross-zone prefetch와 라우팅은 Vercel 네트워크 기능이고 Public Beta다. **착수 전 확정 필요.**
- Next 14 → 15 업그레이드에서 깨지는 것. `next-i18next` 같은 의존성이 없어 위험은 낮아 보이지만 실측 필요.
- `apps/goals`를 `apps/web`의 FSD 슬라이스로 이관할지, 기능을 접을지. FEATURE-000이 목표 저축 UI를 변경 금지 목록에 넣었으므로 **이관**이 기본.
- 세금 zone이 인증을 어떻게 공유하는가. 같은 도메인이므로 쿠키를 공유할 수 있지만, 현재 토큰이 `localStorage`(`ACCESS_TOKEN_KEY`)에 있다 → **zone 간 공유가 안 된다.** 쿠키 기반으로 옮기는 것이 선행일 수 있다. `FE-REQ-013`(F000 API)에서 함께 다룬다.

## 출처

- [Next.js Integration Overview — Module Federation](https://module-federation.io/integrations/framework/nextjs/) — "App Router Not Supported", "Support for Next.js is ending"
- [module-federation/core#2122](https://github.com/module-federation/core/issues/2122) · [#1183](https://github.com/module-federation/core/issues/1183)
- [vercel/next.js#33327](https://github.com/vercel/next.js/discussions/33327) — async boundary 부재
- [Guides: Multi-zones — Next.js](https://nextjs.org/docs/app/guides/multi-zones)
- [vercel-labs/microfrontends-nextjs-app-multi-zone](https://github.com/vercel-labs/microfrontends-nextjs-app-multi-zone)
- [Vercel Microfrontends](https://vercel.com/docs/microfrontends)
- [Announcing Rspack 2.0](https://www.rspack.dev/blog/announcing-2-0)

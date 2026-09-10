---
id: FE-REQ-008
area: fe
kind: ARCH
title: "App Router 이관 + 스트리밍 SSR — 블록 단위로 흘려보낸다"
priority: critical
labels: [architecture, app-router, rsc, streaming, ssr, migration]
created: 2026-09-09
decision: requirements/decisions/ADR-001-microfrontend-replacement.md
---

## Summary

라우팅을 Pages Router(`src/pages/**`)에서 **App Router(`src/app/**`)** 로 옮기고, 화면을 **Suspense 경계로 쪼개 스트리밍**한다. 홈 5블록·세금 콕핏·청구서처럼 **소스가 여러 개이고 그중 하나가 느린 화면**에서, 먼저 온 블록을 먼저 보여준다.

## 왜 스트리밍 SSR인가 — 우리 화면에서 실제로 값이 나오는 자리

"최신 기술이라서"가 아니다. 이 제품에는 **소스가 여러 개이고 지연이 제각각인 화면이 세 개** 있고, 지금 설계는 그 화면들을 **가장 느린 소스에 묶어 놓는다.**

### 자리 1 — 홈 (F006)

홈은 5블록이고 소스가 5개다. 각 소스의 예산이 다르다.

| 블록 | 소스 | 예산 | 성질 |
|---|---|---|---|
| 총자산 | 포트폴리오 + 환율 | ~100ms | 캐시 히트 |
| 이번 주 적립 | `plan/weekly` | ~250ms | 지표는 일 1회 갱신 → 캐시 |
| AI 추천 | `ai-coach/preview` + 성적표 + 실패이력 | **~400ms** | 3종 조립 |
| 세금 D-Day | `tax/cockpit` deadlines | ~100ms | 클라이언트 계산 가능 |
| 청구서 한 줄 | 반사실 스냅샷 | **~1.5s (스냅샷 미스 시)** | 가장 느리다 |

**지금 계약(`GET /api/app/home` 1콜)은 이 5개를 `Promise.allSettled`로 묶는다.** 응답은 가장 느린 것이 끝나야 나간다. 청구서 스냅샷이 미스되면 **총자산 숫자를 1.5초 늦게 본다.**

스트리밍이면 블록마다 `<Suspense>`를 두고 도착 순서대로 흘려보낸다. **총자산은 100ms에 보이고 청구서 줄은 늦게 채워진다.** 부분 실패도 블록 단위로 자연히 격리된다 — `allSettled`로 흉내내던 것이 프레임워크 기능이 된다.

### 자리 2 — 세금 콕핏 (F002)

D-Day 칩(즉시 계산 가능) · 자산군 카드 3개(원장 집계) · 손실수확 솔버(**~500ms**) · 증빙 아카이브가 한 화면이다. PM 기획서의 UX 상태에 이미 *"D-Day는 클라이언트에서 즉시 계산해 먼저 렌더. 자산군 카드만 스켈레톤"* 이라고 적혀 있다. **그게 정확히 Suspense 경계 설계다.** 지금은 그걸 손으로 만들어야 한다.

### 자리 3 — 청구서 (F001)

*"스냅샷을 먼저 렌더하고 상단에 현재가 반영 중 인라인 스피너"* — 같은 패턴이다.

### 값이 없는 자리 — 코치 대화

코치 대화의 토큰 스트리밍은 **스트리밍 SSR이 하는 일이 아니다.** 첫 페인트 이후 계속 흐르는 것이므로 **SSE**가 맞다(`BFF-REQ-006`). 스트리밍 SSR은 대화 화면의 **첫 페인트**(과거 대화 + 추천 카드)만 담당한다.

> 정리: 스트리밍 SSR의 값은 "LLM 응답을 흘리는 것"이 아니라 **"지연이 제각각인 블록을 각자 속도로 보여주는 것"** 이다. 우리 화면 세 개가 정확히 그 모양이다.

---

## 후보 4개를 비교했다

| | A. Pages Router 유지 | B. App Router, 스트리밍 없음 | **C. App Router + Suspense 스트리밍** | D. CSR(SPA) + SSE |
|---|---|---|---|---|
| 부분 지연 처리 | ✗ 가장 느린 소스에 묶임 | ✗ 동일 | **✓ 블록 단위** | △ 클라이언트에서 직접 만들어야 함 |
| 부분 실패 격리 | 손으로 `allSettled` | 손으로 `allSettled` | **✓ Suspense + error boundary** | 손으로 |
| MFE(Multi-Zones) | 해당 | ✓ | **✓** | 별도 구현 필요 |
| 첫 페인트 | 서버 HTML 1회 | 서버 HTML 1회 | **점진적** | 빈 화면 → JS → 데이터 |
| RN과 계약 공유 | ✓ BFF 계약 하나 | ✓ | **✓ (아래 §"BFF 계약" 참조)** | ✓ |
| 이관 비용 | 없음 | 라우트 이관 | **라우트 이관 + 경계 설계** | 전면 재작성 |
| 위험 | 지원 종료 플러그인에 잔류 | — | RSC 경계 실수 시 클라이언트 번들 증가 | SEO·첫 페인트 포기 |

### A를 버린 이유
`FE-REQ-007`의 사실 1~3(MFE 교체가 막힌다)과 §"자리 1~3"의 지연 문제를 영구적으로 안는다.

> **정정 기록.** 초안에서는 "FSD `pages` 레이어 충돌"을 App Router 전환의 근거로 넣었다. **틀렸다.** FSD 공식 가이드는 라우팅 디렉터리를 **프로젝트 루트**에 두고 FSD를 `src/`에 두는 방식으로 충돌을 해결하며 Pages Router에도 적용된다([FSD — Next.js와 함께 사용하기](https://feature-sliced.design/kr/docs/guides/tech/with-nextjs)). 따라서 **FSD는 이 REQ의 근거가 아니다.** 근거는 §"자리 1~3"의 블록별 지연 하나뿐이고, 그것이 충분한지를 FR-30~32이 측정으로 판정한다.

### B를 버린 이유
App Router로 옮기는 비용을 치르고 **가장 큰 값을 안 가져간다.** 라우트를 옮기는 비용과 Suspense 경계를 두는 비용은 같은 작업 안에 있다.

### D를 버린 이유 — 진지하게 검토했다

이 제품은 **비공개·초대제·사용자 ≤10명**이다. SEO가 필요 없고, 첫 방문 성능 압박도 약하다. 그러면 SSR을 아예 버리고 SPA + SSE가 더 단순하지 않은가.

**안 되는 것:** SPA로 가면 §"자리 1~3"의 블록별 지연 처리를 **직접 만들어야 한다.** 5개 쿼리를 각각 걸고, 각각의 로딩·에러·재시도를 관리하고, 워터폴을 피하려면 prefetch를 손으로 배선한다. 그게 정확히 RSC + Suspense가 하는 일이다.

**우리에게 안 맞은 이유:** 우리는 이미 Next 자산(라우팅·번들·이미지 최적화·`packages/ui` 83 subpath)을 갖고 있고, Multi-Zones가 Next를 전제한다(`FE-REQ-007`). D를 고르면 **MFE 방식을 또 다시 골라야 한다.** 결정 하나로 세 개를 만족시키는 C 대신, 세 개를 따로 결정하게 된다.

### C가 우리에게 맞은 결정적 이유

1. **MFE 교체와 같은 작업 안에 있다.** Multi-Zones의 zone은 평범한 Next 앱이므로, zone을 만드는 김에 App Router로 세우면 라우트를 한 번만 옮긴다. 따로 하면 두 번 옮긴다.
2. **PM 기획서가 이미 Suspense 경계를 말로 적어 놓았다.** F001·F002·F006의 UX 상태 절이 "먼저 이것, 나중에 저것"으로 쓰여 있다. 프레임워크 기능으로 그걸 그대로 구현한다.
3. **RSC가 토큰과 계산을 서버에 남긴다.** 이 제품은 "금액 계산은 서버에서, 프론트는 표시만"이 전 영역 공통 수용 기준이다. 서버 컴포넌트가 그 경계를 **구조로** 만든다.

---

## BFF 계약 — 홈 1콜 요구사항은 어떻게 되는가

`FEATURE-005 FR-4`는 *"홈은 `GET /api/app/home` 1콜로 렌더. 개별 기능 API를 홈에서 병렬 호출하지 않는다"* 였다. 근거는 **클라이언트 워터폴 방지**였다.

RSC에서는 그 근거가 달라진다. 서버 컴포넌트가 BFF를 여러 번 부르는 것은 워터폴이 아니다 — 같은 데이터센터 안이고, 각 블록이 자기 요청을 병렬로 띄운다.

그런데 **BFF 집계 엔드포인트를 없애면 안 된다.** 이유가 하나 있다: **RN에는 RSC가 없다.** 모바일은 여전히 1콜 집계가 필요하다. 계약을 두 개 만들면 두 번 유지보수한다.

**결정:**

| 소비자 | 방식 |
|---|---|
| `apps/web` 홈 | 서버 컴포넌트가 **블록별 BFF 엔드포인트**를 각각 호출하고 각각 `<Suspense>`로 감싼다 |
| `apps/mobile` 홈 | **`GET /api/app/home` 집계 1콜** (기존 계약 유지) |
| BFF | 두 형태를 **같은 서비스 함수**에서 만든다. 집계 엔드포인트는 블록 함수들을 `allSettled`로 묶은 얇은 껍데기다 |

이렇게 하면 뷰모델 정의가 한 곳(BFF)에 남고, 웹은 블록 단위로 흘리고 RN은 한 번에 받는다. 상세는 `BFF-REQ-027`(F006 FUNC)·`BFF-REQ-028`(F006 API).

---

## Requirements

### A. 라우팅 이관

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | `apps/web`의 라우팅을 **루트 `app/**`**(= `apps/web/app/`)로 옮긴다. 기존 `src/pages/**`(Next 라우팅)를 제거한다. App Router를 쓰면 **빈 루트 `pages/` 폴더가 필요**하다(공식 가이드) | Must |
| FR-2 | 루트 `app/layout.tsx`는 `<html>`·`<body>` 껍데기만 두고 **전역 프로바이더는 FSD `src/app` 레이어**에서 가져온다(React Query · Toast · Dialog). 프로바이더는 `"use client"` | Must |
| FR-3 | **라우팅 디렉터리는 프로젝트 루트**(`apps/web/app/**`)에 두고, 그 파일은 `src/pages` 슬라이스를 **re-export만** 한다. FSD 공식 Next.js 가이드 방식 (`FE-REQ-009` FR-11~15) | Must |
| FR-4 | 기존 경로를 보존한다: `/`(홈) · `/investments`(→ `/assets`로 리다이렉트) · `/goals`, `/goals/addgoals`. 3탭 IA 경로는 `/`, `/coach`, `/assets` | Must |
| FR-5 | `apps/web-tax`도 App Router를 쓴다. 경로는 `/tax/**` | Must |

### B. 서버·클라이언트 경계

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | **기본은 서버 컴포넌트다.** `"use client"`는 상호작용·브라우저 API·`useState`가 필요한 잎에만 붙인다 | Must |
| FR-11 | 데이터 조회는 서버 컴포넌트에서 한다. **인증 토큰을 클라이언트로 내리지 않는다** — 쿠키에서 읽어 서버에서 BFF를 부른다 | Must |
| FR-12 | `packages/ui`의 컴포넌트 중 상호작용이 있는 것은 파일 상단에 `"use client"`를 갖는다. vanilla-extract는 빌드 타임 CSS이므로 서버 컴포넌트에서도 안전하다 | Must |
| FR-13 | **`lightweight-charts`·`TradingViewChart`·`MovableGrid`는 클라이언트 전용**이다. `next/dynamic` + `ssr: false` 또는 `"use client"` + 동적 import | Must |
| FR-14 | 서버 컴포넌트에서 `Date.now()`·`Math.random()`으로 렌더 결과를 만들지 않는다. 하이드레이션 불일치가 된다. 시각 표시는 서버가 준 ISO 문자열을 클라이언트가 포맷한다 | Must |
| FR-15 | `"use client"` 경계를 넘어가는 props는 **직렬화 가능**해야 한다. 함수·클래스 인스턴스·`Decimal` 객체를 넘기지 않는다 | Must |

### C. Suspense 스트리밍 경계

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | **홈**: 5블록을 각각 `<Suspense fallback={<Skeleton/>}>`로 감싼다. 블록 하나가 느려도 나머지가 먼저 페인트된다 | Must |
| FR-21 | **홈**: 블록별 `error.tsx` 또는 error boundary로 **부분 실패를 격리**한다. 한 블록 실패가 화면 전체를 죽이지 않는다 (F006 FR-5) | Must |
| FR-22 | **세금 콕핏**: D-Day 칩은 Suspense 밖(즉시), 자산군 카드 3개와 솔버 결과는 각각 Suspense 안 | Must |
| FR-23 | **청구서**: 스냅샷 기반 요약은 Suspense 밖 우선 렌더, 현재가 보정분은 Suspense 안 | Must |
| FR-24 | **코치 대화**: 과거 대화 + 최신 추천 카드는 서버에서 스트리밍, 진행 중 응답은 **SSE 클라이언트 구독**(`FE-REQ-032`) | Must |
| FR-25 | `loading.tsx`는 라우트 전체 스켈레톤용이다. **블록 단위 지연에 `loading.tsx`를 쓰지 않는다** — 그러면 전체가 스켈레톤이 된다 | Must |
| FR-26 | Suspense 경계 수는 **화면당 5개 이하**로 제한한다. 경계가 많으면 레이아웃 시프트가 늘고 TTFB 이득이 사라진다 | Should |

### D. 측정과 판정 (D 후보 재검토 게이트)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 이관 전/후 홈의 **첫 블록 페인트 시각**과 **마지막 블록 완료 시각**을 측정해 기록한다. 이관 전은 `GET /api/app/home` 1콜 기준 | Must |
| FR-31 | 스트리밍 이득이 **첫 블록 300ms 이내 + 총 완료 시간 악화 없음**을 만족하지 못하면, 그 화면은 스트리밍을 쓰지 않고 1콜 집계로 되돌린다. **화면 단위 판정** | Must |
| FR-32 | 측정값을 `requirements/reports/checklists/FE-REQ-008.md`에 남긴다 | Must |

## Non-Functional

| 구분 | 요구사항 |
|---|---|
| 성능 | 홈 **첫 블록 페인트 p95 < 300ms**, 전체 완료 p95 < 1.5s. 상세 예산은 `performance-frontend.md` |
| 번들 | `"use client"` 경계 오설정으로 인한 클라이언트 번들 증가를 막는다. 이관 전/후 클라이언트 JS gzip 크기를 기록하고 **증가분 40KB 이하** |
| 접근성 | 스트리밍으로 늦게 도착하는 블록에 `aria-busy`를 주고, 도착 시 해제한다. **레이아웃 시프트를 막기 위해 스켈레톤이 실제 블록과 같은 높이**를 갖는다 |
| SSR 안전성 | 서버 컴포넌트에서 `window`·`localStorage`·`navigator` 접근 0건. 기존 규칙 `.claude/rules/ssr.md` 준수 |
| 되돌리기 | 화면 단위로 스트리밍을 끌 수 있어야 한다(FR-31). Suspense 경계 제거가 커밋 하나 |

## Acceptance Criteria

- [ ] `apps/web/app/`(루트)이 라우팅이고, 그 파일들이 `@/pages/*` re-export만 한다
- [ ] `apps/web/pages/`가 빈 폴더로 존재한다(App Router 요구사항, README만)
- [ ] `apps/web/src/pages/`는 **FSD pages 레이어**다 (`FE-REQ-009` 이후)
- [ ] 홈에서 **총자산 블록이 청구서 블록보다 먼저 페인트된다** (네트워크 스로틀 + Performance 패널로 확인)
- [ ] 청구서 소스를 강제 실패시키면 **그 블록만** 에러 상태이고 나머지 4블록이 정상이다
- [ ] 세금 콕핏에서 D-Day 칩이 자산군 카드보다 먼저 보인다
- [ ] 인증 토큰이 클라이언트 JS 번들과 `localStorage`에 없다 (쿠키 기반)
- [ ] `grep -rn "use client" apps/web/src` 결과가 **`src/app`의 프로바이더와 잎 컴포넌트로 한정**된다
- [ ] 서버 컴포넌트에서 `window|localStorage|navigator` 참조가 0건이다
- [ ] 클라이언트 JS gzip 증가분이 40KB 이하다 (측정값 기록)
- [ ] 홈 첫 블록 페인트 p95 < 300ms (측정값 기록)
- [ ] `pnpm build` · `pnpm lint` 통과, 하이드레이션 경고 0건

## Trace

| FR | 산출물 | 검증 |
|---|---|---|
| FR-1~5 | `apps/web/src/app/**` | 라우트 순회 200 |
| FR-10~15 | `"use client"` 배치 | grep + 번들 분석 |
| FR-20~26 | 각 화면 Suspense 경계 | 스로틀 하에 블록 순서 확인 |
| FR-30~32 | checklist 리포트 | 측정값 존재 |

## Dependencies

- **선행:** `FE-REQ-007`(MFE 교체 — zone 구성이 먼저여야 라우트를 한 번만 옮긴다)
- **후속:** `FE-REQ-009`(FSD 전환). 순서 의존은 아니다 — FSD는 라우터 종류와 무관하게 루트/`src` 분리로 성립한다. 다만 라우트 파일을 두 번 만들지 않으려면 App Router 이관 후에 FSD `pages` 슬라이스를 붙이는 것이 싸다
- **연동:** `BFF-REQ-006`(SSE 기반) — FR-24가 소비한다. `BFF-REQ-028`(F006 API) — 블록별 엔드포인트와 집계 엔드포인트 공존
- **영향:** `salt-server/**` 없음

## Open Questions

- **인증을 쿠키로 옮기는 범위.** 현재 `ACCESS_TOKEN_KEY`/`REFRESH_TOKEN_KEY`가 `localStorage`에 있다. 서버 컴포넌트가 토큰을 읽으려면 쿠키여야 하고, zone 간 공유에도 쿠키가 필요하다(`FE-REQ-007` Open Question). **httpOnly 쿠키 + BFF에서 갱신**이 기본안. `FE-REQ-013`에서 확정.
- Next 15의 `cookies()`가 dynamic rendering을 강제하므로 **정적 최적화가 사라진다.** 이 앱은 전부 인증 화면이라 문제가 아니지만, 로그인 화면만 정적으로 남길지 결정 필요.
- `@repo/ui` 44종 중 몇 개가 `"use client"`를 필요로 하는지 실측. `feature/repo-ui-component` 병합 후 확인.
- 스트리밍과 React Query의 역할 분담. 서버에서 첫 데이터를 흘리고 클라이언트에서 갱신하려면 `HydrationBoundary`가 필요하다. **서버 컴포넌트로 조회하고 React Query는 mutation·실시간 갱신에만** 쓰는 것이 기본안.

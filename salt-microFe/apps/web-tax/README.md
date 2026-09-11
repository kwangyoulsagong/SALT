# `apps/web-tax` — tax zone

`/tax/*`만 담당하는 두 번째 zone이다 (FE-REQ-007 FR-2).

## 왜 별도 zone인가

`.claude/rules/microfrontend.md` §2의 세 조건을 **모두** 만족하는 유일한 경계다.

1. **릴리스 이유가 다르다** — 법령 파라미터(시행일·세율·공제·기준일·거래세율) 변경. 법이 바뀌면 이 zone만 배포한다.
2. **자주 오가지 않는다** — 연말과 5월에 들어온다. 홈의 `세금 D-Day` 한 줄에서 진입한다.
3. **무거운 코드를 갖는다** — 취득가액 lot 엔진 · 손실수확 솔버 · 환율 함정 탐지 · 결제 캘린더.
   이 코드가 매일 쓰는 홈·코치 번들에 실려 갈 이유가 없다.

zone 진입 1회의 hard navigation은 **치를 만한 대가**로 판단했다. 3탭은 자르지 않는다.

## 설정

- `assetPrefix: "/tax-static"` — 정적 자산이 `/tax-static/_next/...`로 나간다.
- 라우팅은 `app/tax/**`이고 `@/pages/tax`를 re-export만 한다. 화면은 `src/pages/tax/**`다 (FE-REQ-008 FR-5).
  루트 `pages/`는 **빈 폴더**다 — Next가 `src/pages`를 Pages Router로 집지 않게 하는 장치다.
- **`app/page.tsx`를 두지 않는다.** zone 루트(`/`)는 default zone의 경로다.
  두면 `/`가 두 zone에 동시에 생겨 "zone 간 경로 중복 0건"(FE-REQ-007)이 깨진다.
- **경로는 zone 간 유일해야 한다** (FR-4).
- 프록시는 default zone(`apps/web`)의 `rewrites`가 한다. 이 앱은 프록시를 갖지 않는다.

## 코드 공유

`apps/web/src/**`를 **직접 import하지 않는다** (FR-33). 공유는 `@repo/tokens` · `@repo/ui` · `@repo/core`로만 한다.

## 명령

```bash
pnpm --filter web-tax dev      # 3001
pnpm --filter web-tax build
```

로컬에서 `/tax`를 확인하려면 두 zone을 같이 띄운다 — 루트에서 `pnpm dev` (FR-22).

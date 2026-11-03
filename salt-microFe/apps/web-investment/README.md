# web-investment — 투자 zone

투자 화면을 서비스한다(2026-11-02 `FE-REQ-053` — 전에는 셸 `apps/web` 이 서비스). 경로 `/investments` · `/coach`(`/report` · `/signals/[signalType]` · `/settings`) · `/search` · 포트 3002 · assetPrefix `/investment-static`(dev 만 — 운영 빌드는 공용 `/_next` + `pnpm static:merge`) — 값은 `@repo/core/zones`(`registry.json`, `invest.hostedIn = "web-investment"`).

- zone 앱은 얇다 — `app/` 라우트 · 레이아웃 · `next.config.js` 만. 화면은 `@repo/domain-invest`(`microfrontend.md` §2-4), 레이아웃 공용 부분은 `@repo/web-shared/layout`
- `tsconfig.json` `paths` 가 패키지 안 레이어 alias(`@/entities` …)를 `packages/domain-invest/src` 로 푼다
- `next.config.js` `env.NEXT_PUBLIC_ZONE_APP` — 공용 코드가 "다른 zone 인가"를 이 앱 기준으로 판정
- 셸(`apps/web`)이 경로를 `fallback` rewrite 로 여기 보낸다. origin 은 env `ZONE_INVEST_ORIGIN`(기본 `http://localhost:3002`). 로컬 상시 기동은 루트 `ops/salt.sh up`
- 이미지 · 정적 파일 · `/_next/image` 는 같은 origin 의 셸이 서비스한다 — 3002 를 직접 열면 안 보인다(셸 3000 으로 연다)

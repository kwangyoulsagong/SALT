# web-investment — 투자 zone

빈 골격(`FE-REQ-052` FR-7). 경로 `/investments` · `/coach` · `/search` · 포트 3002 · assetPrefix `/investment-static` — 값은 `@repo/core/zones`(`registry.json`).

- zone 앱은 얇다 — `app/` 라우트 · 레이아웃 · `next.config.js` 만. 화면은 `@repo/domain-invest`(`microfrontend.md` §2-4)
- 지금 이 도메인 화면을 서비스하는 앱: `web` (옮기는 REQ FE-REQ-053)
- 셸(`apps/web`)이 경로를 `fallback` rewrite 로 여기 보낸다. origin 은 env `ZONE_INVEST_ORIGIN`(기본 `http://localhost:3002`)

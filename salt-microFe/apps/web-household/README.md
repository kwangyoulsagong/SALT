# web-household — 가계부 zone

가계부 화면을 서비스한다(`FE-REQ-052` FR-7 골격 → `FE-REQ-057` 2026-11-04 — `/household` · `/household/new` · `/household/budget` · `/household/month/[ym]`). 경로 `/household` · 포트 3004 · assetPrefix `/household-static`(dev 만 — 운영 빌드는 공용 `/_next`, `ADR-005` 규칙 7 개정 2026-11-03) — 값은 `@repo/core/zones`(`registry.json`).

- zone 앱은 얇다 — `app/` 라우트 · 레이아웃 · `next.config.js` 만. 화면은 `@repo/domain-household`(`microfrontend.md` §2-4)
- 지금 이 도메인 화면을 서비스하는 앱: `web-household`
- 셸(`apps/web`)이 경로를 `fallback` rewrite 로 여기 보낸다. origin 은 env `ZONE_HOUSEHOLD_ORIGIN`(기본 `http://localhost:3004`)

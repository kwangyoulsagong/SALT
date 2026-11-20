# web-mobile — 휴대폰 PWA zone(`/m/*`)

휴대폰 화면 표면 zone 하나(`ADR-012` — 도메인 zone 이 아니다). 경로 `/m` · 포트 3006 · assetPrefix `/mobile-static`(dev 만 — 운영은 공용 `/_next`) — 값은 `@repo/core/zones`(`registry.json` `mobile`).

- zone 앱은 얇다 — `app/` 라우트 · 레이아웃 · `next.config.js` · `middleware.ts` 만. 틀(하단 탭 · 로그인 · 매니페스트 · 서비스 워커)은 `@repo/web-shared/layout/mobile`, 화면은 `@repo/domain-<x>/mobile/*`(`FE-REQ-072`) — `domain-*/pages` 는 레이어 규칙 `mobile-domain` 이 막는다
- 탭 넷(`/m/home` · `/m/goals` · `/m/household` · `/m/investments`)은 지금 자리 한 장 — `FE-REQ-072` 가 화면을 옮겨 온다
- 서비스 워커 `/m/sw.js`(범위 `/m/`)는 운영 빌드에서만 등록한다. 판은 빌드 시각(`MOBILE_SW_VERSION`)
- 데스크톱 zone 미들웨어가 휴대폰 문서 이동을 대응표(`registry.json` `mobileRedirects`)대로 여기 보낸다

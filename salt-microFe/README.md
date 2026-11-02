# SALT MicroFE

SALT 프론트엔드 모노레포. `pnpm` workspace + Turborepo.

## 구조

```
apps/
  web/             셸 zone (3000) — /, /home, /login, /onboarding, /settings (+ 옮기기 전 투자 · 저축 화면)
  web-investment/  투자 zone (3002) — /investments, /coach, /search   ┐
  web-savings/     저축 zone (3003) — /goals                          │ 빈 골격(FE-REQ-052).
  web-household/   가계부 zone (3004) — /household                     │ 화면은 FE-REQ-053 · F012~F014
  web-tips/        금융 팁 zone (3005) — /tips                         ┘
packages/
  tokens/            플랫폼 중립 디자인 토큰 (순수 TS. 웹·RN 공용)
  core/              플랫폼 무관 모델·상수 + zone 레지스트리
  ui/                웹 전용 디자인 시스템 (@repo/ui, vanilla-extract)
  eslint-plugin-zone/ zone 경계 lint 규칙(레지스트리 전체)
  eslint-plugin-fsd/  FSD 레이어 · 도메인 축 규칙 표(layer-rules.cjs — 훅과 lint 가 같이 읽는다)
  eslint-config/ · typescript-config/
```

## 마이크로프론트엔드 — Next.js Multi-Zones

조립은 **빌드가 아니라 요청 라우팅**에서 일어난다. zone은 평범한 Next 앱이고, default zone의
`rewrites`가 도메인 zone 4개로 프록시한다 — **zone = 도메인**(`ADR-005`), 규칙은 레지스트리(`@repo/core/zones`)에서 생성한다.

`@module-federation/nextjs-mf`는 **쓰지 않는다.** 공식 문서에 `App Router Not Supported`와
`Support for Next.js is ending`이 명시되어 있다. 근거와 후보 비교는
[`requirements/decisions/ADR-001-microfrontend-replacement.md`](../requirements/decisions/ADR-001-microfrontend-replacement.md),
규칙은 [`.claude/rules/microfrontend.md`](.claude/rules/microfrontend.md)에 있다.

| zone | 앱 | 경로 | `assetPrefix` |
|---|---|---|---|
| shell | `apps/web` | `/` `/home` `/login` `/onboarding` `/settings` | 없음 |
| invest | `apps/web-investment` | `/investments` `/coach` `/search` | `/investment-static` |
| savings | `apps/web-savings` | `/goals` | `/savings-static` |
| household | `apps/web-household` | `/household` | `/household-static` |
| tips | `apps/web-tips` | `/tips` | `/tips-static` |

값의 단일 소스는 `packages/core/src/zones/registry.json`. 셸 rewrites 는 경로를 `fallback` 으로 걸어 **셸에 아직 있는 화면은 셸이 받는다**(`hostedIn`).

**zone을 넘는 링크는 `<a>`(=`CrossZoneLink`)다.** `next/link`의 `<Link>`를 쓰면
`@repo/zone/no-cross-zone-link`가 lint에서 막는다.

## 명령

```bash
pnpm dev           # zone 5개 동시 기동. 도메인 경로가 3000 을 통해 프록시된다
pnpm build
pnpm lint
pnpm check-types
```

개별 zone은 `pnpm --filter web dev`, `pnpm --filter web-investment dev` 등.

## 환경변수

| 변수 | 기본값 | 용도 |
|---|---|---|
| `ZONE_<ID>_ORIGIN` | `http://localhost:<devPort>` | 셸이 프록시할 도메인 zone origin(`ZONE_INVEST_ORIGIN` · `ZONE_SAVINGS_ORIGIN` · `ZONE_HOUSEHOLD_ORIGIN` · `ZONE_TIPS_ORIGIN`) |
| `APP_ALLOWED_ORIGINS` | `localhost:3000` | Server Actions `allowedOrigins` |
| `NEXT_PUBLIC_BASE_URL` | `http://localhost:8000` | 인증·목표 API |
| `NEXT_PUBLIC_INVESTMENTS_BASE_URL` | `http://localhost:4001` | 투자 API |
| `NEXT_PUBLIC_WEBSOCKET_URL` | `ws://localhost:4002` | 실시간 시세 |

## 문서

- 작업 규칙: [`CLAUDE.md`](CLAUDE.md)
- 규칙 문서: [`.claude/rules/`](.claude/rules/)
- 요구사항: [`requirements/`](requirements/)

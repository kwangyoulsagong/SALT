# SALT MicroFE

SALT 프론트엔드 모노레포. `pnpm` workspace + Turborepo.

## 구조

```
apps/
  web/       default zone (3000) — /, /home, /investments, /goals/*
  web-tax/   tax zone     (3001) — /tax/*
packages/
  tokens/            플랫폼 중립 디자인 토큰 (순수 TS. 웹·RN 공용)
  core/              플랫폼 무관 모델·상수 + zone 레지스트리
  ui/                웹 전용 디자인 시스템 (@repo/ui, vanilla-extract)
  mocks/             MSW 핸들러
  eslint-plugin-zone/ zone 경계 lint 규칙
  eslint-config/ · typescript-config/
```

## 마이크로프론트엔드 — Next.js Multi-Zones

조립은 **빌드가 아니라 요청 라우팅**에서 일어난다. zone은 평범한 Next 앱이고, default zone의
`rewrites`가 `/tax*`를 세금 zone으로 프록시한다.

`@module-federation/nextjs-mf`는 **쓰지 않는다.** 공식 문서에 `App Router Not Supported`와
`Support for Next.js is ending`이 명시되어 있다. 근거와 후보 비교는
[`requirements/decisions/ADR-001-microfrontend-replacement.md`](../requirements/decisions/ADR-001-microfrontend-replacement.md),
규칙은 [`.claude/rules/microfrontend.md`](.claude/rules/microfrontend.md)에 있다.

| zone | 앱 | 경로 | `assetPrefix` |
|---|---|---|---|
| default | `apps/web` | 나머지 전부 | 없음 |
| tax | `apps/web-tax` | `/tax/*` | `/tax-static` |

**zone을 넘는 링크는 `<a>`(=`CrossZoneLink`)다.** `next/link`의 `<Link>`를 쓰면
`@repo/zone/no-cross-zone-link`가 lint에서 막는다.

## 명령

```bash
pnpm dev           # 두 zone 동시 기동. /tax 가 3000 을 통해 프록시된다
pnpm build
pnpm lint
pnpm check-types
```

개별 zone은 `pnpm --filter web dev`, `pnpm --filter web-tax dev`.

## 환경변수

| 변수 | 기본값 | 용도 |
|---|---|---|
| `TAX_ZONE_ORIGIN` | `http://localhost:3001` | default zone이 프록시할 세금 zone origin |
| `APP_ALLOWED_ORIGINS` | `localhost:3000` | Server Actions `allowedOrigins` |
| `NEXT_PUBLIC_BASE_URL` | `http://localhost:8000` | 인증·목표 API |
| `NEXT_PUBLIC_INVESTMENTS_BASE_URL` | `http://localhost:4001` | 투자 API |
| `NEXT_PUBLIC_WEBSOCKET_URL` | `ws://localhost:4002` | 실시간 시세 |

## 문서

- 작업 규칙: [`CLAUDE.md`](CLAUDE.md) · [`AGENTS.md`](AGENTS.md)
- 규칙 문서: [`.claude/rules/`](.claude/rules/)
- 요구사항: [`requirements/`](requirements/)

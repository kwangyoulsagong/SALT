/* eslint-disable @typescript-eslint/no-require-imports */
const { ZONES, zoneRewrites } = require("@repo/core/zones/node");

/**
 * zone 공용 Next 설정 프리셋 (`FE-REQ-054` FR-5, `ADR-005` §3 "공용 청크 같은 해시").
 *
 * zone 5개의 `next.config.js` 가 **이 함수 하나**로 설정을 만든다. 손으로 다섯 벌을 쓰면 한 곳만 바뀌어
 * (React 엄격 모드 · 이미지 허용 · Server Actions origin · 변환 패키지) 같은 의존이 zone 마다 다른 청크가 된다.
 * 바뀌는 것은 zone 몫뿐이다 — `assetPrefix` · `NEXT_PUBLIC_ZONE_APP`(레지스트리 값) · 셸만 rewrites · 앱이 더하는 변환 패키지.
 *
 * vanilla-extract 플러그인은 화면이 있는 zone 만 감싼다(빈 골격은 의존이 없다) — 앱 `next.config.js` 가 고른다.
 *
 * ## 정적 파일 경로 — dev 는 zone 별, 운영 빌드는 공용 `/_next` (`ADR-005` 규칙 7 개정 2026-11-03)
 *
 * 운영 청크는 이름에 내용 해시가 들어 있다 — 이름이 같으면 내용도 같다. 그래서 zone 마다 다른 assetPrefix 를 두면 같은 청크가
 * 다른 URL 이 되어 캐시를 못 나눴다(실측: 셸 → 투자 같은 청크 5개 · 117 KB 재다운로드). 운영 빌드는 assetPrefix 를 두지 않고,
 * 배포가 zone 의 `.next/static` 을 한 저장소에 합친다(같은 이름 · 다른 내용이면 실패 — `scripts/merge-zone-static.mjs`).
 * dev 청크는 해시가 없어(`app/layout.js`) 합치면 서로 덮으므로 dev 만 레지스트리 assetPrefix 를 쓴다.
 * `ZONE_STATIC=per-zone` 이면 운영 빌드도 zone 별(합치기 없이 zone 하나만 띄울 때).
 *
 * @param {"shell" | "invest" | "savings" | "household" | "tips"} zoneId 레지스트리 zone id
 * @param {{ transpilePackages?: string[] }} [options]
 * @returns {import('next').NextConfig}
 */
/** 운영 빌드이고 zone 별을 고르지 않았으면 공용 `/_next` */
function usesSharedStatic(env = process.env) {
  return env.NODE_ENV === "production" && env.ZONE_STATIC !== "per-zone";
}

/**
 * 셸 rewrites — zone 레지스트리 규칙 + **BFF 같은 origin 경로**(`FE-REQ-013` FR-80 2단계, 2026-11-05).
 *
 * 토큰이 httpOnly 쿠키라 브라우저는 BFF 를 같은 origin `/api/*` 로 부른다(쿠키가 자연히 실린다). 운영은 한 origin 경로 라우팅이
 * BFF 에 직접 보내고(`ADR-008`), 이 규칙은 로컬 · 폴백이다. `afterFiles` 라서 셸 Route Handler(`/api/session` · `/api/session/refresh`)가
 * 먼저 받는다 — 운영 라우팅도 같은 예외를 둔다(`OPS-001`).
 */
function shellRewrites(env = process.env) {
  const rules = zoneRewrites(env);
  const bff = env.BFF_INTERNAL_URL || "http://localhost:4001";
  return { ...rules, afterFiles: [...rules.afterFiles, { source: "/api/:path*", destination: `${bff}/api/:path*` }] };
}

function zoneNextConfig(zoneId, options = {}) {
  const zone = ZONES[zoneId];
  if (!zone) throw new Error(`레지스트리에 없는 zone: ${zoneId}`);
  const isShell = zone.assetPrefix === null;

  /** 사용자 대면 도메인. 한 도메인이 여러 앱을 서비스하므로 Server Actions 에 명시가 필요하다 (FE-REQ-007 FR-23) */
  const allowedOrigins = (process.env.APP_ALLOWED_ORIGINS || "localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  /** @type {import('next').NextConfig} */
  const config = {
    reactStrictMode: true,
    // 공용 코드(`ZoneLink` · `CrossZoneLink` · 내비게이션)가 "다른 zone 인가"를 이 앱 기준으로 판정한다(`FE-REQ-053`)
    env: { NEXT_PUBLIC_ZONE_APP: zone.app },
    images: {
      remotePatterns: [
        { protocol: "https", hostname: "**" },
        { protocol: "http", hostname: "localhost" },
      ],
    },
    transpilePackages: ["@repo/core", ...(options.transpilePackages ?? [])],
    experimental: {
      serverActions: { allowedOrigins },
    },
  };

  // 셸은 assetPrefix 를 갖지 않고(default zone) 도메인 zone 으로 가는 요청을 프록시한다 — 규칙은 레지스트리에서 생성
  if (isShell) {
    config.rewrites = async () => shellRewrites(process.env);
  } else if (!usesSharedStatic()) {
    config.assetPrefix = zone.assetPrefix;
  }
  return config;
}

module.exports = { zoneNextConfig, usesSharedStatic, shellRewrites };

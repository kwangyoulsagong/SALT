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
 * 실제로 해시가 같아지는지는 빌드 산출물로 잰다(`checklists/FE-REQ-054.md`).
 *
 * @param {"shell" | "invest" | "savings" | "household" | "tips"} zoneId 레지스트리 zone id
 * @param {{ transpilePackages?: string[] }} [options]
 * @returns {import('next').NextConfig}
 */
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
    config.rewrites = async () => zoneRewrites(process.env);
  } else {
    config.assetPrefix = zone.assetPrefix;
  }
  return config;
}

module.exports = { zoneNextConfig };

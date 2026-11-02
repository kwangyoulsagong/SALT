/* eslint-disable @typescript-eslint/no-require-imports -- eslintrc · next.config 가 읽는 CommonJS 다 */
/* global require, module */
"use strict";

/**
 * zone 레지스트리 — CommonJS 소비자용 (`FE-REQ-052` FR-3 · FR-4 · FR-5).
 *
 * 소비자: 셸 `next.config.js`(rewrites) · `@repo/zone/no-cross-zone-link`(eslintrc 는 ESM 을 못 읽는다) ·
 * `layer-rules.cjs`(도메인 축 — 훅과 lint 가 같이 읽는다).
 *
 * **데이터는 `registry.json` 한 곳.** TS 쪽(`registry.ts`)과 계산이 같은지는 `registry.test.ts` 가 대조한다.
 */

const DATA = require("./registry.json");

const ZONES = DATA.zones;
const ZONE_IDS = Object.keys(ZONES);
const SHELL_APP = ZONES.shell.app;

const zoneIdOfApp = (app) => ZONE_IDS.find((id) => ZONES[id].app === app) || null;

/**
 * `app` 에서 봤을 때 **다른 앱이 서비스하는** 경로 prefix.
 *
 * 경로는 그 도메인 화면을 지금 서비스하는 앱(`hostedIn`)이 기준이다 — 셸에 남은 투자 화면은 셸 안 이동이다.
 * 정적 자산 prefix 는 늘 자기 zone 앱이 서비스한다.
 */
const crossZonePathPrefixes = (app) =>
  ZONE_IDS.flatMap((id) => {
    const zone = ZONES[id];
    const paths = zone.hostedIn === app ? [] : zone.pathPrefixes;
    const assets = zone.assetPrefix && zone.app !== app ? [zone.assetPrefix] : [];
    return [...paths, ...assets];
  });

/** `ZONE_<ID>_ORIGIN` — 없으면 개발 포트. */
const zoneOrigin = (id, env = {}) =>
  env[`ZONE_${id.toUpperCase()}_ORIGIN`] || `http://localhost:${ZONES[id].devPort}`;

/**
 * 셸 rewrites (FR-3). 손으로 쓰지 않는다.
 *
 * 경로는 `fallback` — 셸에 그 화면이 아직 있으면(옮기기 전) 셸이 받고, 없을 때만 zone 으로 간다.
 * `afterFiles` 면 동적 라우트(`/investments/[symbol]`)보다 rewrite 가 먼저라 셸 화면을 가로챈다.
 * 정적 자산은 셸에 같은 경로가 없으니 `afterFiles`.
 */
const zoneRewrites = (env = {}) => {
  const afterFiles = [];
  const fallback = [];
  for (const id of ZONE_IDS) {
    const zone = ZONES[id];
    if (zone.app === SHELL_APP) continue;
    const origin = zoneOrigin(id, env);
    for (const prefix of zone.pathPrefixes) {
      fallback.push({ source: prefix, destination: `${origin}${prefix}` });
      fallback.push({ source: `${prefix}/:path+`, destination: `${origin}${prefix}/:path+` });
    }
    if (zone.assetPrefix) {
      afterFiles.push({
        source: `${zone.assetPrefix}/:path+`,
        destination: `${origin}${zone.assetPrefix}/:path+`,
      });
    }
  }
  return { beforeFiles: [], afterFiles, fallback };
};

/** zone 앱 → 그 앱이 소비해도 되는 도메인 패키지. 셸은 `null`. */
const domainPackageOfApp = (app) => {
  const id = zoneIdOfApp(app);
  return id ? ZONES[id].domainPackage : null;
};

/** `packages/domain-<x>` 디렉터리 이름 → 패키지 이름 */
const DOMAIN_PACKAGES = ZONE_IDS.map((id) => ZONES[id].domainPackage).filter(Boolean);

/** 셸이 아닌 zone 앱 이름 */
const DOMAIN_ZONE_APPS = ZONE_IDS.filter((id) => ZONES[id].app !== SHELL_APP).map(
  (id) => ZONES[id].app
);

module.exports = {
  ZONES,
  ZONE_IDS,
  SHELL_APP,
  DOMAIN_PACKAGES,
  DOMAIN_ZONE_APPS,
  zoneIdOfApp,
  crossZonePathPrefixes,
  zoneOrigin,
  zoneRewrites,
  domainPackageOfApp,
};

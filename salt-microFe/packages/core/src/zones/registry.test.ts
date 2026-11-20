import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

import {
  CROSS_ZONE_PATH_PREFIXES,
  ZONE_IDS,
  ZONES,
  crossZonePathPrefixes,
  isCrossZonePath,
  MOBILE_REDIRECTS,
  zoneOfPath,
} from "./registry";

// CommonJS 소비자(next.config · eslint · 훅)가 읽는 쪽 — 같은 계산인지 대조한다 (FE-REQ-052 FR-2 · 5)
const require = createRequire(import.meta.url);
const node = require("./registry.cjs") as {
  ZONE_IDS: string[];
  crossZonePathPrefixes: (app: string) => string[];
  zoneRewrites: (env?: Record<string, string>) => {
    afterFiles: { source: string; destination: string }[];
    fallback: { source: string; destination: string }[];
  };
  domainPackageOfApp: (app: string) => string | null;
};

describe("zone 레지스트리 (ADR-005)", () => {
  it("zone 6개 — 셸 + 도메인 4 + 휴대폰 표면 1(ADR-012)", () => {
    expect([...ZONE_IDS]).toEqual(["shell", "invest", "savings", "household", "tips", "mobile"]);
    expect(node.ZONE_IDS).toEqual([...ZONE_IDS]);
    expect(ZONE_IDS.map((id) => ZONES[id].app)).toEqual([
      "web",
      "web-investment",
      "web-savings",
      "web-household",
      "web-tips",
      "web-mobile",
    ]);
    expect(ZONE_IDS.filter((id) => ZONES[id].surface === "mobile")).toEqual(["mobile"]);
  });

  it("휴대폰 zone 은 /m 하나 — 도메인 zone 이 아니다(FE-REQ-071 FR-1)", () => {
    const n = node as unknown as { DOMAIN_ZONE_APPS: string[]; MOBILE_ZONE_APPS: string[] };
    expect(n.MOBILE_ZONE_APPS).toEqual(["web-mobile"]);
    expect(n.DOMAIN_ZONE_APPS).not.toContain("web-mobile");
    expect(zoneOfPath("/m/home")).toBe("mobile");
    expect(zoneOfPath("/m")).toBe("mobile");
    // 접두 일치는 `/m/` 까지 — `/market` 은 휴대폰 경로가 아니다
    expect(zoneOfPath("/market")).toBe("shell");
    expect(isCrossZonePath("/m/home")).toBe(true);
    expect(isCrossZonePath("/m/goals", "web-mobile")).toBe(false);
    expect(isCrossZonePath("/goals", "web-mobile")).toBe(true);
    expect(node.zoneRewrites().fallback).toContainEqual({
      source: "/m/:path+",
      destination: "http://localhost:3006/m/:path+",
    });
  });

  it("휴대폰 대응표 — 목적지는 /m 안 · 출발지는 데스크톱 · 겹침 없음", () => {
    for (const row of MOBILE_REDIRECTS) {
      expect(zoneOfPath(row.to)).toBe("mobile");
      expect(zoneOfPath(row.from)).not.toBe("mobile");
    }
    const froms = MOBILE_REDIRECTS.map((row) => row.from);
    expect(new Set(froms).size).toBe(froms.length);
  });

  it("경로 prefix · assetPrefix · 포트가 zone 간 유일하다", () => {
    const prefixes = ZONE_IDS.flatMap((id) => [
      ...ZONES[id].pathPrefixes,
      ...(ZONES[id].assetPrefix ? [ZONES[id].assetPrefix as string] : []),
    ]);
    expect(new Set(prefixes).size).toBe(prefixes.length);
    const ports = ZONE_IDS.map((id) => ZONES[id].devPort);
    expect(new Set(ports).size).toBe(ports.length);
  });

  it("빠졌던 셸 경로를 바로잡았다 — /search 는 투자, /onboarding · /login 은 셸", () => {
    expect(zoneOfPath("/search")).toBe("invest");
    expect(zoneOfPath("/onboarding")).toBe("shell");
    expect(zoneOfPath("/login")).toBe("shell");
    expect(zoneOfPath("/goals/addgoals")).toBe("savings");
    expect(zoneOfPath("/investments/BTC?mode=swing")).toBe("invest");
    expect(zoneOfPath("/tipsy")).toBe("shell");
  });

  it("TS 와 CommonJS 의 cross-zone 계산이 앱마다 같다", () => {
    for (const id of ZONE_IDS) {
      const app = ZONES[id].app;
      expect(node.crossZonePathPrefixes(app)).toEqual([...crossZonePathPrefixes(app)]);
    }
  });

  it("투자(FE-REQ-053) · 저축(FE-REQ-056)은 자기 zone · 가계부 · 팁도 zone 을 넘는다", () => {
    expect(isCrossZonePath("/investments/BTC")).toBe(true);
    expect(isCrossZonePath("/coach/settings")).toBe(true);
    expect(isCrossZonePath("/goals/addgoals")).toBe(true);
    expect(isCrossZonePath("/goals/new")).toBe(true);
    expect(isCrossZonePath("/household")).toBe(true);
    expect(isCrossZonePath("/tips/abc#top")).toBe(true);
    expect(isCrossZonePath("/investment-static/_next/a.js")).toBe(true);
    // 투자 zone 앱에서 보면 자기 경로는 안, 셸 · 셸이 서비스하는 저축 경로는 앱을 넘는다
    expect(isCrossZonePath("/investments/BTC", "web-investment")).toBe(false);
    expect(isCrossZonePath("/coach/report#scoreboard", "web-investment")).toBe(false);
    expect(isCrossZonePath("/", "web-investment")).toBe(true);
    expect(isCrossZonePath("/home", "web-investment")).toBe(true);
    expect(isCrossZonePath("/settings", "web-investment")).toBe(true);
    // 알림은 셸 화면 — 도메인 zone 머리 벨은 문서 이동(2026-11-18 F006)
    expect(isCrossZonePath("/alerts", "web-household")).toBe(true);
    expect(isCrossZonePath("/alerts", "web")).toBe(false);
    expect(isCrossZonePath("/goals/addgoals", "web-investment")).toBe(true);
    expect(CROSS_ZONE_PATH_PREFIXES).not.toContain("/");
  });

  it("셸 rewrites — 경로는 fallback, 자산은 afterFiles, origin 은 ZONE_<ID>_ORIGIN", () => {
    const rewrites = node.zoneRewrites({ ZONE_TIPS_ORIGIN: "https://tips.internal" });
    expect(rewrites.fallback).toContainEqual({ source: "/goals", destination: "http://localhost:3003/goals" });
    expect(rewrites.fallback).toContainEqual({
      source: "/tips/:path+",
      destination: "https://tips.internal/tips/:path+",
    });
    expect(rewrites.afterFiles).toContainEqual({
      source: "/investment-static/:path+",
      destination: "http://localhost:3002/investment-static/:path+",
    });
    expect([...rewrites.afterFiles, ...rewrites.fallback].some((r) => r.source.startsWith("/home"))).toBe(false);
    expect(rewrites.afterFiles.some((r) => r.source.startsWith("/tax"))).toBe(false);
  });

  it("도메인 패키지는 자기 zone 앱만 — 셸은 없음", () => {
    expect(node.domainPackageOfApp("web")).toBeNull();
    expect(node.domainPackageOfApp("web-investment")).toBe("@repo/domain-invest");
    expect(node.domainPackageOfApp("mobile")).toBeNull();
  });
});

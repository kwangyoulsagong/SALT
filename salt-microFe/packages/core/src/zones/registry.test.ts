import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

import {
  CROSS_ZONE_PATH_PREFIXES,
  ZONE_IDS,
  ZONES,
  crossZonePathPrefixes,
  isCrossZonePath,
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
  it("zone 5개 — 셸 + 도메인 4", () => {
    expect([...ZONE_IDS]).toEqual(["shell", "invest", "savings", "household", "tips"]);
    expect(node.ZONE_IDS).toEqual([...ZONE_IDS]);
    expect(ZONE_IDS.map((id) => ZONES[id].app)).toEqual([
      "web",
      "web-investment",
      "web-savings",
      "web-household",
      "web-tips",
    ]);
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

  it("투자는 자기 zone(FE-REQ-053) · 옮기기 전 저축은 셸 안 이동 · 가계부 · 팁은 zone 을 넘는다", () => {
    expect(isCrossZonePath("/investments/BTC")).toBe(true);
    expect(isCrossZonePath("/coach/settings")).toBe(true);
    expect(isCrossZonePath("/goals/addgoals")).toBe(false);
    expect(isCrossZonePath("/household")).toBe(true);
    expect(isCrossZonePath("/tips/abc#top")).toBe(true);
    expect(isCrossZonePath("/investment-static/_next/a.js")).toBe(true);
    // 투자 zone 앱에서 보면 자기 경로는 안, 셸 · 셸이 서비스하는 저축 경로는 앱을 넘는다
    expect(isCrossZonePath("/investments/BTC", "web-investment")).toBe(false);
    expect(isCrossZonePath("/coach/report#scoreboard", "web-investment")).toBe(false);
    expect(isCrossZonePath("/", "web-investment")).toBe(true);
    expect(isCrossZonePath("/home", "web-investment")).toBe(true);
    expect(isCrossZonePath("/settings", "web-investment")).toBe(true);
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

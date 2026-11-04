import { describe, expect, it } from "vitest";

import { ZONES, zoneOfPath } from "../zones/registry";
import {
  APP_TABS,
  activeAppTab,
  browserFamily,
  buildZoneNavigationMetric,
  parseZoneNavigationStart,
} from "./index";

describe("앱 탭 (FE-REQ-054 FR-1 · FR-2)", () => {
  it("탭 4개 — 홈 · 저축 · 가계부 · 투자 순서, 금융 팁은 탭이 아니다", () => {
    expect(APP_TABS.map((tab) => tab.label)).toEqual(["홈", "저축", "가계부", "투자"]);
    expect(APP_TABS.some((tab) => tab.zone === "tips")).toBe(false);
  });

  it("탭 경로는 그 탭의 zone 이 담당한다(레지스트리와 어긋나지 않는다)", () => {
    for (const tab of APP_TABS) {
      expect(zoneOfPath(tab.href)).toBe(tab.zone);
      expect(ZONES[tab.zone]).toBeDefined();
    }
  });

  it("첫 화면이 없는 탭은 그 화면을 만드는 REQ 를 적는다", () => {
    const notReady = APP_TABS.filter((tab) => tab.readyBy !== null).map((tab) => [tab.id, tab.readyBy]);
    // 가계부가 첫 화면을 얻었다(FE-REQ-057, 2026-11-04) — 지금 탭은 전부 눌린다
    expect(notReady).toEqual([]);
  });

  it.each([
    ["/home", "home"],
    ["/home?x=1", "home"],
    ["/investments", "invest"],
    ["/investments/BTC", "invest"],
    ["/coach/report", "invest"],
    ["/search", "invest"],
    ["/goals/addgoals", "savings"],
    ["/goals/new", "savings"],
    ["/goals/3f2b", "savings"],
    ["/household", "household"],
    ["/settings", null],
    ["/onboarding", null],
    ["/", null],
    ["/tips", null],
  ])("%s → %s", (path, tab) => {
    expect(activeAppTab(path)).toBe(tab);
  });
});

describe("zone 간 이동 계측 (FE-REQ-054 FR-6)", () => {
  const chromeUa =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
  const safariUa =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
  const start = { fromApp: "web", toApp: "web-investment", at: 1_000 };

  it("브라우저 계열", () => {
    expect(browserFamily(chromeUa)).toBe("chromium");
    expect(browserFamily(safariUa)).toBe("safari");
    expect(browserFamily("Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0")).toBe("firefox");
    expect(browserFamily("curl/8")).toBe("other");
  });

  it("표지 읽기 — 깨진 값은 버린다", () => {
    expect(parseZoneNavigationStart(JSON.stringify(start))).toEqual(start);
    expect(parseZoneNavigationStart("{")).toBeNull();
    expect(parseZoneNavigationStart(JSON.stringify({ fromApp: "web" }))).toBeNull();
    expect(parseZoneNavigationStart(null)).toBeNull();
  });

  it("prerender 적중 = activationStart > 0", () => {
    const base = { start, currentApp: "web-investment", arrivedAt: 1_180, userAgent: chromeUa };
    expect(buildZoneNavigationMetric({ ...base, activationStart: 42 })).toEqual({
      fromApp: "web",
      toApp: "web-investment",
      durationMs: 180,
      prerendered: true,
      browser: "chromium",
    });
    expect(buildZoneNavigationMetric({ ...base, activationStart: 0 })?.prerendered).toBe(false);
  });

  it("다른 앱에 도착했거나 · 오래됐거나 · 시계가 거꾸로면 세지 않는다", () => {
    const base = { start, activationStart: 0, userAgent: safariUa };
    expect(buildZoneNavigationMetric({ ...base, currentApp: "web", arrivedAt: 1_100 })).toBeNull();
    expect(buildZoneNavigationMetric({ ...base, currentApp: "web-investment", arrivedAt: 40_000 })).toBeNull();
    expect(buildZoneNavigationMetric({ ...base, currentApp: "web-investment", arrivedAt: 900 })).toBeNull();
    expect(buildZoneNavigationMetric({ ...base, start: null, currentApp: "web-investment", arrivedAt: 1_100 })).toBeNull();
  });
});

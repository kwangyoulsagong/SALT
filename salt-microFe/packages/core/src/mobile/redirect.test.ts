import { describe, expect, it } from "vitest";

import type { MobileRedirect } from "../zones/registry";

import { MOBILE_REDIRECT_MATCHER_SOURCE, isPhone, mobilePathOf, mobileRedirectOf, type MobileRedirectRequest } from "./redirect";

/** 휴대폰 → /m 이동 경계 표 (`FE-REQ-071` FR-7) — 표 하나로 허용 · 거절을 같이 본다 */
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X) AppleWebKit/605.1.15 Version/18.4 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36";
const ANDROID_TABLET = "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 Chrome/131.0 Safari/537.36";
const IPAD = "Mozilla/5.0 (iPad; CPU OS 18_4 like Mac OS X) AppleWebKit/605.1.15 Version/18.4 Mobile/15E148 Safari/604.1";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0 Safari/537.36";
const GOOGLEBOT = "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36 (compatible; Googlebot/2.1)";

const TABLE: readonly MobileRedirect[] = [
  { from: "/", to: "/m/login", prefix: false, by: "test" },
  { from: "/goals", to: "/m/goals", prefix: true, by: "test" },
];

const request = (over: {
  ua?: string;
  path?: string;
  search?: string;
  method?: string;
  headers?: Record<string, string>;
  cookie?: string | null;
}): MobileRedirectRequest => {
  const headers: Record<string, string> = {
    "user-agent": over.ua ?? IPHONE,
    "sec-fetch-mode": "navigate",
    ...over.headers,
  };
  return {
    method: over.method ?? "GET",
    pathname: over.path ?? "/goals",
    search: over.search ?? "",
    header: (name) => headers[name] ?? null,
    viewCookie: over.cookie ?? null,
  };
};

describe("mobileRedirectOf — 보내는 것", () => {
  it.each([
    ["iPhone 문서 이동", request({}), "/m/goals"],
    ["Android 문서 이동", request({ ua: ANDROID }), "/m/goals"],
    ["prefix 뒤를 그대로 · 쿼리 그대로", request({ path: "/goals/12", search: "?tab=log" }), "/m/goals/12?tab=log"],
    ["루트는 정확히 일치만", request({ path: "/" }), "/m/login"],
    ["힌트 ?1 이면 UA 가 데스크톱이어도", request({ ua: MAC, headers: { "sec-ch-ua-mobile": "?1" } }), "/m/goals"],
  ])("%s", (_name, req, expected) => {
    expect(mobileRedirectOf(req, TABLE)).toBe(expected);
  });
});

describe("mobileRedirectOf — 그대로 두는 것", () => {
  it.each([
    ["데스크톱", request({ ua: MAC })],
    ["iPad", request({ ua: IPAD })],
    ["Android 태블릿", request({ ua: ANDROID_TABLET })],
    ["힌트 ?0 이면 UA 가 Mobile 이어도(태블릿 Chrome)", request({ ua: ANDROID, headers: { "sec-ch-ua-mobile": "?0" } })],
    ["데스크톱 화면으로 보기 쿠키", request({ cookie: "desktop" })],
    ["POST", request({ method: "POST" })],
    ["HEAD", request({ method: "HEAD" })],
    ["fetch(문서 이동 아님)", request({ headers: { "sec-fetch-mode": "cors" } })],
    ["Sec-Fetch-Mode 없음", request({ headers: { "sec-fetch-mode": "" } })],
    ["RSC 요청", request({ headers: { rsc: "1" } })],
    ["라우터 prefetch", request({ headers: { "next-router-prefetch": "1" } })],
    ["미들웨어 prefetch", request({ headers: { "x-middleware-prefetch": "1" } })],
    ["Speculation Rules prerender", request({ headers: { "sec-purpose": "prefetch;prerender" } })],
    ["봇", request({ ua: GOOGLEBOT })],
    ["API", request({ path: "/api/app/home" })],
    ["정적 파일", request({ path: "/goals/icon.png" })],
    ["zone 정적 경로", request({ path: "/savings-static/_next/static/chunks/a" })],
    ["/_next", request({ path: "/_next/static/chunks/a" })],
    ["이미 /m — 되돌리지 않는다", request({ path: "/m/goals" })],
    ["대응표에 없는 경로 — 768 미만 안내가 대신", request({ path: "/household" })],
    ["prefix 아닌 행은 하위 경로를 잡지 않는다", request({ path: "/anything" })],
    ["접두 일치는 슬래시까지 — /goalsx", request({ path: "/goalsx" })],
  ])("%s", (_name, req) => {
    expect(mobileRedirectOf(req, TABLE)).toBeNull();
  });
});

describe("mobilePathOf · isPhone", () => {
  it("정확히 일치가 prefix 보다 먼저", () => {
    const table: MobileRedirect[] = [
      { from: "/goals", to: "/m/goals", prefix: true, by: "t" },
      { from: "/goals/new", to: "/m/goals/add", prefix: false, by: "t" },
    ];
    expect(mobilePathOf("/goals/new", table)).toBe("/m/goals/add");
    expect(mobilePathOf("/goals/3", table)).toBe("/m/goals/3");
  });

  it("레지스트리 대응표 — 로그인 화면만(FE-REQ-071)", () => {
    expect(mobilePathOf("/")).toBe("/m/login");
    expect(mobilePathOf("/login")).toBe("/m/login");
    expect(mobilePathOf("/home")).toBeNull();
  });

  it("UA 만으로 — iPod 도 휴대폰", () => {
    const header = (ua: string) => (name: string) => (name === "user-agent" ? ua : null);
    expect(isPhone(header("Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0)"))).toBe(true);
    expect(isPhone(header(MAC))).toBe(false);
  });
});

describe("zone 미들웨어 matcher — 데스크톱 zone 다섯이 같은 글자(FE-REQ-071 FR-7)", () => {
  it("판정 함수 · matcher 를 다 같이 쓴다", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { ZONES, ZONE_IDS } = await import("../zones/registry");
    const { MOBILE_REDIRECT_MATCHER_SOURCE } = await import("./redirect");
    const apps = ZONE_IDS.filter((id) => ZONES[id].surface === "desktop").map((id) => ZONES[id].app);
    expect(apps).toHaveLength(5);
    for (const app of apps) {
      const source = readFileSync(join(__dirname, "../../../../apps", app, "middleware.ts"), "utf8");
      expect(source, app).toContain("mobileRedirectOf(fromRequest(request))");
      expect(source, app).toContain(JSON.stringify(MOBILE_REDIRECT_MATCHER_SOURCE));
    }
  });

  it("matcher 가 거르는 것 · 잡는 것", () => {
    const re = new RegExp(`^${MOBILE_REDIRECT_MATCHER_SOURCE}$`);
    for (const path of ["/", "/home", "/goals/1", "/market"]) expect(re.test(path), path).toBe(true);
    for (const path of ["/m", "/m/home", "/_next/static/a.js", "/api/app/x", "/icon.svg"]) expect(re.test(path), path).toBe(false);
  });
});

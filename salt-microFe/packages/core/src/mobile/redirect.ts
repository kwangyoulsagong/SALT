/**
 * 휴대폰 → `/m` 이동 판정 (`FE-REQ-071` FR-7, `ADR-012` §2 "이동 · 판별").
 *
 * 데스크톱 zone 다섯의 미들웨어가 **이 함수 하나**를 부른다(판정이 zone 마다 갈리면 같은 링크가 zone 에 따라 다르게 열린다).
 * 순수 함수라 Next 없이 표로 시험한다(`redirect.test.ts`).
 *
 * 보내는 것은 **휴대폰의 문서 이동(GET) 하나**뿐이다 — RSC · prefetch · prerender · API · 정적 파일 · 봇 · POST 는 그대로 둔다.
 * 한 방향(데스크톱 → `/m`)이고 `/m` 은 되돌려 보내지 않는다. "데스크톱 화면으로 보기"가 단 쿠키가 있으면 보내지 않는다.
 * 대응표(`MOBILE_REDIRECTS`)에 없는 경로도 보내지 않는다 — 그 화면은 768 미만 안내를 본다.
 */
import { MOBILE_REDIRECTS, ZONES, ZONE_IDS, type MobileRedirect } from "../zones/registry";

/** "데스크톱 화면으로 보기" — 이 쿠키가 있으면 휴대폰이어도 보내지 않는다 */
export const VIEW_COOKIE = "view";
export const VIEW_DESKTOP = "desktop";
/** 쿠키 수명(초) — 30일. `/m` 문서로 다시 오면 지운다(사용자가 휴대폰 화면을 고른 것) */
export const VIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/** 이동 응답에 다는 헤더 — 같은 URL 이 기기에 따라 다르게 답하므로 공유 캐시가 섞지 않게 */
export const MOBILE_REDIRECT_HEADERS: Readonly<Record<string, string>> = {
  Vary: "User-Agent, Sec-CH-UA-Mobile",
  "Cache-Control": "private, no-store",
};

/** 판정에 필요한 요청 조각 — Next `NextRequest` 에서 미들웨어가 옮겨 담는다 */
export interface MobileRedirectRequest {
  readonly method: string;
  readonly pathname: string;
  /** `?a=1` 꼴(없으면 빈 문자열) — 이동한 곳에 그대로 붙인다 */
  readonly search: string;
  /** 소문자 이름으로 헤더를 읽는다 */
  readonly header: (name: string) => string | null;
  /** `view` 쿠키 값 */
  readonly viewCookie: string | null;
}

const BOT = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|lighthouse|headlesschrome/i;
const TABLET = /iPad|Tablet|PlayBook|Silk|Kindle/i;

/**
 * 휴대폰인가. `Sec-CH-UA-Mobile` 이 있으면 그것만 믿고(Chromium), 없으면 UA(`iPhone` · `Mobile`) — 태블릿은 데스크톱.
 * Android 태블릿 Chrome 은 UA 에 `Mobile` 이 없고 `Sec-CH-UA-Mobile: ?0` 이다.
 */
export const isPhone = (header: MobileRedirectRequest["header"]): boolean => {
  const hint = header("sec-ch-ua-mobile");
  if (hint === "?1") return true;
  if (hint === "?0") return false;
  const ua = header("user-agent") ?? "";
  if (TABLET.test(ua)) return false;
  return /iPhone|iPod/.test(ua) || /Mobile/.test(ua);
};

/** 문서 이동인가 — 주소창 · 링크 · 새로고침. RSC · prefetch · prerender 는 아니다 */
const isDocumentNavigation = (req: MobileRedirectRequest): boolean => {
  if (req.method !== "GET") return false;
  if (req.header("sec-fetch-mode") !== "navigate") return false;
  if (req.header("rsc") !== null || req.header("next-router-prefetch") !== null) return false;
  if (req.header("x-middleware-prefetch") !== null) return false;
  const purpose = `${req.header("sec-purpose") ?? ""} ${req.header("purpose") ?? ""}`;
  return !/prefetch|prerender/i.test(purpose);
};

/** zone 정적 경로(dev assetPrefix) · `/_next` · `/api` · 확장자 있는 파일 · `/m` 자신 */
const isPassThroughPath = (pathname: string): boolean => {
  if (pathname === "/m" || pathname.startsWith("/m/")) return true;
  if (pathname.startsWith("/_next/") || pathname.startsWith("/api/") || pathname === "/api") return true;
  const assetPrefixes = ZONE_IDS.map((id) => ZONES[id].assetPrefix).filter((p): p is string => p !== null);
  if (assetPrefixes.some((prefix) => pathname.startsWith(`${prefix}/`))) return true;
  return /\.[a-z0-9]+$/i.test(pathname);
};

/** 대응표에서 `/m` 경로를 찾는다. 정확히 일치가 prefix 보다 먼저 */
export const mobilePathOf = (
  pathname: string,
  table: readonly MobileRedirect[] = MOBILE_REDIRECTS
): string | null => {
  const exact = table.find((row) => row.from === pathname);
  if (exact) return exact.to;
  const prefixed = table.find((row) => row.prefix && row.from !== "/" && pathname.startsWith(`${row.from}/`));
  return prefixed ? `${prefixed.to}${pathname.slice(prefixed.from.length)}` : null;
};

/**
 * 보낼 곳(`/m/…?…`) 또는 `null`(그대로 둔다).
 *
 * @param table 시험용 — 기본은 레지스트리 대응표
 */
export const mobileRedirectOf = (
  req: MobileRedirectRequest,
  table: readonly MobileRedirect[] = MOBILE_REDIRECTS
): string | null => {
  if (isPassThroughPath(req.pathname)) return null;
  if (!isDocumentNavigation(req)) return null;
  if (req.viewCookie === VIEW_DESKTOP) return null;
  if (BOT.test(req.header("user-agent") ?? "")) return null;
  if (!isPhone(req.header)) return null;
  const to = mobilePathOf(req.pathname, table);
  return to ? `${to}${req.search}` : null;
};

/**
 * 휴대폰 zone 의 고정 경로 — 매니페스트 · 서비스 워커 · 미들웨어 · 화면이 같은 값을 본다(`FE-REQ-071` FR-3 · FR-4).
 * `scope` 는 **끝 슬래시까지** — 접두 일치라 `/m` 이면 `/market` 도 범위가 된다(리서치 §1).
 */
export const MOBILE_PATHS = {
  scope: "/m/",
  home: "/m/home",
  login: "/m/login",
  offline: "/m/offline",
  /** "데스크톱 화면으로 보기" — `view=desktop` 쿠키를 달고 `?to=` 로 보낸다 */
  desktop: "/m/desktop",
  manifest: "/m/manifest.webmanifest",
  serviceWorker: "/m/sw.js",
  /** PWA 아이콘 — `pnpm brand:icons` 가 `apps/web-mobile/public/m/icons/` 에 굽는다 */
  icons: "/m/icons",
} as const;

/** Next `NextRequest` 의 판정에 필요한 모양만 — core 는 Next 를 모른다 */
export interface RequestLike {
  readonly method: string;
  readonly nextUrl: { readonly pathname: string; readonly search: string };
  readonly headers: { get(name: string): string | null };
  readonly cookies: { get(name: string): { value: string } | undefined };
}

/** 미들웨어가 `mobileRedirectOf(fromRequest(request))` 로 부른다 — zone 다섯이 같은 한 줄 */
export const fromRequest = (request: RequestLike): MobileRedirectRequest => ({
  method: request.method,
  pathname: request.nextUrl.pathname,
  search: request.nextUrl.search,
  header: (name) => request.headers.get(name),
  viewCookie: request.cookies.get(VIEW_COOKIE)?.value ?? null,
});

/**
 * 미들웨어 matcher 가 거르지 못한 것은 `mobileRedirectOf` 가 다시 거른다. matcher 는 Next 가 정적으로 읽어야 해서
 * zone `middleware.ts` 마다 같은 글자를 둔다 — `/_next` · `/api` · `/m` · 확장자 있는 파일을 뺀 전부.
 */
export const MOBILE_REDIRECT_MATCHER_SOURCE = "/((?!_next/|api/|m/|m$|.*\\.[a-zA-Z0-9]+$).*)";

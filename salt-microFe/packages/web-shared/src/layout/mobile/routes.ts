import type { Metadata, Viewport } from "next";

import { tokens } from "@repo/tokens";
import { safeNextPath } from "@repo/core/auth";
import { MOBILE_PATHS, VIEW_COOKIE, VIEW_COOKIE_MAX_AGE, VIEW_DESKTOP } from "@repo/core/mobile";

import { SITE_DESCRIPTION, SITE_NAME } from "../../config";

import { offlineHtml } from "./offlinePage";

export { offlineHtml };

/**
 * 휴대폰 zone 의 Route Handler 몸통 · 메타데이터(`FE-REQ-071` FR-3 · FR-4 · FR-7). 라우팅 파일(`apps/web-mobile/app/m/**`)은
 * 이것을 re-export 만 한다. 값은 `@repo/core/mobile` `MOBILE_PATHS` 한 벌.
 */

const THEME = tokens.colors.background.white;

/** PWA 아이콘 — `pnpm brand:icons` 가 `apps/web-mobile/public/m/icons/` 에 굽는다(원본은 `@repo/tokens` `BRAND_MARK`) */
export const MOBILE_ICONS = {
  any192: `${MOBILE_PATHS.icons}/icon-192.png`,
  any512: `${MOBILE_PATHS.icons}/icon-512.png`,
  maskable512: `${MOBILE_PATHS.icons}/maskable-512.png`,
  apple180: `${MOBILE_PATHS.icons}/apple-touch-icon.png`,
} as const;

/**
 * 매니페스트 — `id` 는 바꾸면 다른 앱이 된다(고정) · `scope` 끝 슬래시 · iOS 는 `standalone` 만 본다(리서치 §1).
 * `<link rel="manifest">` 는 `/m` 레이아웃의 메타데이터에만 — 데스크톱 경로에는 매니페스트 링크 0.
 */
export const mobileManifest = () => ({
  id: MOBILE_PATHS.scope,
  name: SITE_NAME,
  short_name: SITE_NAME,
  description: SITE_DESCRIPTION,
  lang: "ko",
  start_url: MOBILE_PATHS.home,
  scope: MOBILE_PATHS.scope,
  display: "standalone",
  theme_color: THEME,
  background_color: THEME,
  icons: [
    { src: MOBILE_ICONS.any192, sizes: "192x192", type: "image/png", purpose: "any" },
    { src: MOBILE_ICONS.any512, sizes: "512x512", type: "image/png", purpose: "any" },
    { src: MOBILE_ICONS.maskable512, sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
});

export const manifestResponse = () =>
  new Response(JSON.stringify(mobileManifest()), {
    headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "no-cache" },
  });

/**
 * 서비스 워커 원문(`FE-REQ-071` FR-4).
 *
 * - precache 는 오프라인 한 장 + 아이콘뿐. 정적 청크(`/_next/static` · dev 와 로컬 per-zone 의 `/<zone>-static/_next/static`)는
 *   이름에 내용 해시가 있어 처음 받을 때 담고 그 뒤로 캐시에서 준다
 * - 문서는 네트워크 — 실패하면 오프라인 한 장. **RSC · API 는 손대지 않는다**(`Vary: RSC` 함정 · 개인 데이터 통째 캐시 금지)
 * - 판(`version`)이 바뀌면 활성화 때 옛 캐시를 지운다. Cache API 는 만료가 없어 지우는 것은 이 코드 몫이다
 */
export const serviceWorkerSource = (version: string): string => {
  const precache = [MOBILE_PATHS.offline, ...Object.values(MOBILE_ICONS)];
  return `/* SALT 휴대폰 서비스 워커 — 판 ${version}. 원본: packages/web-shared/src/layout/mobile/routes.ts */
const PREFIX = "salt-m-";
const CACHE = PREFIX + ${JSON.stringify(version)};
const OFFLINE = ${JSON.stringify(MOBILE_PATHS.offline)};
const PRECACHE = ${JSON.stringify(precache)};
const STATIC = /^\\/(?:[a-z-]+-static\\/)?_next\\/static\\/|^\\/m\\/icons\\//;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith(PREFIX) && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE)));
    return;
  }
  if (!STATIC.test(url.pathname)) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(request);
      if (hit) return hit;
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
  );
});

/* 웹 푸시(FE-REQ-078) — 본문은 Declarative Web Push 모양({ web_push: 8030, notification: { title, body, navigate } }).
   Declarative 를 아는 브라우저(iOS 18.4+)는 event.notification 을 이미 들고 오고, 여기서 띄우지 않으면 그것을 그대로 띄운다.
   모르는 브라우저는 같은 JSON 을 읽어 띄운다 — 푸시마다 알림 하나(조용한 푸시 0). */
const ICON = ${JSON.stringify(MOBILE_ICONS.any192)};
const navigateTarget = (navigate) => {
  const fallback = self.location.origin + "/m/home";
  if (typeof navigate !== "string") return fallback;
  try {
    const url = new URL(navigate, self.location.origin);
    return url.origin === self.location.origin && (url.pathname === "/m" || url.pathname.startsWith("/m/")) ? url.href : fallback;
  } catch (error) {
    return fallback;
  }
};

self.addEventListener("push", (event) => {
  if (event.notification) return;
  let note = null;
  try {
    note = event.data ? event.data.json().notification : null;
  } catch (error) {
    note = null;
  }
  const title = note && typeof note.title === "string" ? note.title : "SALT";
  const body = note && typeof note.body === "string" ? note.body : "";
  event.waitUntil(
    self.registration.showNotification(title, { body, icon: ICON, badge: ICON, lang: "ko-KR", data: { navigate: navigateTarget(note && note.navigate) } })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = navigateTarget((event.notification.data && event.notification.data.navigate) || event.notification.navigate);
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => new URL(client.url).pathname.startsWith("/m"));
      if (open) return open.navigate(target).then((client) => (client || open).focus());
      return self.clients.openWindow(target);
    })
  );
});
`;
};

/** sw.js 는 늘 다시 확인한다(`no-cache`) — 새 판을 바로 알아챈다 */
export const serviceWorkerResponse = (version: string) =>
  new Response(serviceWorkerSource(version), {
    headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-cache" },
  });

export const offlineResponse = () =>
  new Response(offlineHtml(), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" } });

/**
 * "데스크톱 화면으로 보기"(`FE-REQ-071` FR-7) — `view=desktop` 쿠키(path `/` · 30일)를 달고 `?to=` 로. `to` 는 우리 경로만
 * (`safeNextPath`), `/m` 이면 데스크톱이 아니니 루트로.
 */
export const desktopViewResponse = (request: Request) => {
  const url = new URL(request.url);
  const asked = safeNextPath(url.searchParams.get("to"));
  const to = asked && asked !== "/m" && !asked.startsWith("/m/") ? asked : "/";
  return new Response(null, {
    status: 302,
    headers: {
      Location: to,
      "Set-Cookie": `${VIEW_COOKIE}=${VIEW_DESKTOP}; Path=/; Max-Age=${VIEW_COOKIE_MAX_AGE}; SameSite=Lax`,
      "Cache-Control": "private, no-store",
    },
  });
};

/** `/m` 루트 레이아웃 메타데이터 — 매니페스트 · iOS 설치 메타 · 검색 제외(로그인 화면들) */
export const mobileMetadata: Metadata = {
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  manifest: MOBILE_PATHS.manifest,
  robots: { index: false, follow: false },
  icons: { apple: [{ url: MOBILE_ICONS.apple180, sizes: "180x180" }] },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

/** `viewport-fit=cover` 는 `/m` 에만 — 안전 영역을 틀이 직접 비운다. 확대 금지는 쓰지 않는다(입력 16px 이상으로 막는다) */
export const mobileViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: THEME,
};

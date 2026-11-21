import { tokens } from "@repo/tokens";
import { USER_KEY } from "@repo/core/auth";
import { OFFLINE_DB, OFFLINE_SCREENS } from "@repo/core/mobile";

import { SITE_NAME } from "../../config";

import { MOBILE_MESSAGES } from "./messages";

/**
 * 오프라인 한 장(`FE-REQ-071` FR-4 · `FE-REQ-073` FR-2) — 서비스 워커가 precache 해 두었다가 문서 이동이 실패하면 준다.
 * 스스로 완결된 HTML(인라인 스타일 · 인라인 스크립트 · 청크 0) — Next 페이지로 만들면 오프라인에서 그 청크가 없을 수 있다.
 *
 * 인라인 스크립트가 **그 경로의 한 벌**을 그린다: 경로 → 화면(`OFFLINE_SCREENS`) · 이 기기 세션 사용자 id(`USER_KEY`) ·
 * IndexedDB(`OFFLINE_DB`) — 사용자가 다르거나 없으면 그리지 않는다(`offlineRecordFor` 와 같은 판정). 한 벌이 없으면 원래 한 장.
 * 글자는 `textContent` 로만 넣는다(저장 글자가 HTML 로 해석되지 않게).
 */

/**
 * "기준" 시각 글자 — `@repo/core/mobile` `offlineStampText` 와 같은 결과(시험이 대조). 인라인 스크립트에 그대로 들어가 import 가 없다
 */
export const OFFLINE_STAMP_SOURCE = `function (at, now) {
  var tz = "Asia/Seoul";
  var day = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  var clock = new Intl.DateTimeFormat("ko-KR", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(at));
  if (day.format(new Date(at)) === day.format(new Date(now))) return clock;
  return new Intl.DateTimeFormat("ko-KR", { timeZone: tz, month: "numeric", day: "numeric" }).format(new Date(at)) + " " + clock;
}`;

const escapeHtml = (text: string) => text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
/** `</script>` 로 스크립트가 끊기지 않게 */
const scriptJson = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");

const MARK = "\u0000";

const offlineScript = (): string => {
  const M = MOBILE_MESSAGES;
  const [stampBefore, stampAfter] = M.offlineStamp(MARK).split(MARK);
  const config = {
    db: OFFLINE_DB,
    screens: OFFLINE_SCREENS,
    userKey: USER_KEY,
    text: {
      stampBefore,
      stampAfter,
      note: M.snapshotNote,
      navLabel: M.offlineNavLabel,
      nav: M.offlineNav,
      retry: M.offlineRetry,
    },
  };
  return `(function () {
  var C = ${scriptJson(config)};
  var stamp = ${OFFLINE_STAMP_SOURCE};
  var path = location.pathname.replace(/\\/+$/, "");
  var screen = null;
  for (var key in C.screens) if (C.screens[key] === path) screen = key;
  var uid = null;
  try {
    var user = JSON.parse(localStorage.getItem(C.userKey) || "null");
    if (user && typeof user.id === "string" && user.id) uid = user.id;
  } catch (e) {}
  if (!screen || !uid || !window.indexedDB) return;
  var request;
  try { request = indexedDB.open(C.db.name, C.db.version); } catch (e) { return; }
  // 저장소가 없으면 만들지 않는다 — 여기서 빈 DB 를 만들면 앱이 같은 판으로 열 때 저장소를 못 만든다
  request.onupgradeneeded = function () { request.transaction.abort(); };
  request.onsuccess = function () {
    var db = request.result;
    if (!db.objectStoreNames.contains(C.db.store)) { db.close(); return; }
    var get = db.transaction(C.db.store, "readonly").objectStore(C.db.store).get(screen);
    get.onsuccess = function () { db.close(); render(get.result); };
    get.onerror = function () { db.close(); };
  };
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = String(text);
    return node;
  }
  function valid(r) {
    return !!r && r.userId === uid && r.screen === screen && typeof r.fetchedAt === "number" &&
      !!r.snapshot && typeof r.snapshot.title === "string" && Array.isArray(r.snapshot.sections);
  }
  function render(r) {
    if (!valid(r)) return;
    var main = document.getElementById("m-offline");
    main.textContent = "";
    document.body.className = "snap";
    main.setAttribute("data-offline-snapshot", screen);
    main.appendChild(el("h1", null, r.snapshot.title));
    var band = el("p", "band", C.text.stampBefore + stamp(r.fetchedAt, Date.now()) + C.text.stampAfter);
    band.setAttribute("role", "status");
    main.appendChild(band);
    r.snapshot.sections.forEach(function (section) {
      if (!section || !Array.isArray(section.rows)) return;
      var card = el("section", "card");
      card.appendChild(el("h2", null, section.title));
      var list = el("ul");
      section.rows.forEach(function (row) {
        if (!row) return;
        var item = el("li");
        var left = el("span", "left");
        left.appendChild(el("span", "label", row.label));
        if (row.sub) left.appendChild(el("span", "sub", row.sub));
        item.appendChild(left);
        item.appendChild(el("span", "value", row.value));
        list.appendChild(item);
      });
      card.appendChild(list);
      main.appendChild(card);
    });
    main.appendChild(el("p", "note", C.text.note));
    var nav = el("nav");
    nav.setAttribute("aria-label", C.text.navLabel);
    for (var k in C.screens) {
      var link = el("a", k === screen ? "on" : null, C.text.nav[k]);
      link.href = C.screens[k];
      if (k === screen) link.setAttribute("aria-current", "page");
      nav.appendChild(link);
    }
    main.appendChild(nav);
    var retry = el("button", null, C.text.retry);
    retry.type = "button";
    retry.onclick = function () { location.reload(); };
    main.appendChild(retry);
  }
})();`;
};

export const offlineHtml = (): string => {
  const t = tokens;
  const M = MOBILE_MESSAGES;
  const theme = t.colors.background.white;
  const type = t.appType;
  const css = [
    `body{margin:0;min-height:100dvh;display:flex;flex-direction:column;justify-content:center;padding:24px;box-sizing:border-box;background:${theme};color:${t.colors.text.primary};font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR",sans-serif}`,
    `main{display:flex;flex-direction:column;gap:12px}`,
    `h1{margin:0;font-size:${type.title.fontSize};line-height:${type.title.lineHeight};font-weight:${type.title.fontWeight}}`,
    `p{margin:0;color:${t.colors.neutral[700]};font-size:${type.desc.fontSize};line-height:${type.desc.lineHeight}}`,
    `button{margin-top:12px;min-height:52px;border:0;border-radius:12px;background:${t.colors.brand.primary};color:${theme};font-size:${type.body.fontSize};font-weight:${type.body.fontWeight}}`,
    // 한 벌을 그릴 때 — 탭 화면처럼 회색 바탕 위 흰 카드(`mobile-design.md` §1)
    `body.snap{justify-content:flex-start;padding:24px 15px calc(24px + env(safe-area-inset-bottom,0px));background:${t.colors.neutral[100]}}`,
    `body.snap main{gap:14px}body.snap h1{padding:0 5px}`,
    `.band{padding:10px 16px;border-radius:12px;background:${t.colors.neutral[200]};color:${t.colors.neutral[800]};font-size:${type.caption.fontSize};line-height:${type.caption.lineHeight};font-weight:600;text-align:center;font-variant-numeric:tabular-nums}`,
    `.card{padding:20px;border-radius:20px;background:${theme}}`,
    `.card h2{margin:0 0 4px;font-size:${type.body.fontSize};line-height:${type.body.lineHeight};font-weight:700;color:${t.colors.neutral[800]}}`,
    `ul{list-style:none;margin:0;padding:0}li{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0}li+li{border-top:1px solid ${t.colors.neutral[100]}}`,
    `.left{display:flex;flex-direction:column;gap:2px;min-width:0}.label{font-size:${type.body.fontSize};line-height:${type.body.lineHeight};color:${t.colors.neutral[800]};word-break:keep-all}`,
    `.sub{font-size:${type.caption.fontSize};line-height:${type.caption.lineHeight};color:${t.colors.text.tertiary}}`,
    `.value{flex-shrink:0;max-width:55%;text-align:right;font-size:${type.body.fontSize};line-height:${type.body.lineHeight};font-weight:700;color:${t.colors.neutral[900]};font-variant-numeric:tabular-nums;overflow-wrap:anywhere}`,
    `.note{text-align:center;font-size:${type.caption.fontSize};line-height:${type.caption.lineHeight};color:${t.colors.text.tertiary}}`,
    `nav{display:flex;justify-content:center;gap:8px}nav a{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:999px;background:${theme};color:${t.colors.neutral[700]};font-size:${type.desc.fontSize};font-weight:600;text-decoration:none}nav a.on{background:${t.colors.neutral[200]};color:${t.colors.neutral[900]}}`,
  ].join("");
  return `<!doctype html><html lang="ko" data-surface="mobile"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="${theme}"><title>${escapeHtml(M.offlineTitle)} | ${escapeHtml(SITE_NAME)}</title>
<style>${css}</style></head>
<body><main id="m-offline"><h1>${escapeHtml(M.offlineTitle)}</h1><p>${escapeHtml(M.offlineBody)}</p><button type="button" onclick="location.reload()">${escapeHtml(M.offlineRetry)}</button></main>
<script>${offlineScript()}</script></body></html>`;
};

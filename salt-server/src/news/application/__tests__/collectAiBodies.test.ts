import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  AiBodyDue,
  AiBodyLink,
  AiBodyStatus,
  AiBodyStore,
  AiSourceStore,
  AiTitle,
  OutletDef,
  OutletFeedPort,
  OutletRow,
  RobotsSnapshot,
  RssItem,
} from "../../domain";
import { CollectAiBodies } from "../CollectAiBodies";

/** SRV-REQ-058 FR-1~5 — 한 회차가 매체 판정 · RSS · 잇기 · 받기 · 지우기를 순서대로, 실패는 그 단위만 건너뛴다 */

const NOW = new Date("2026-11-13T01:00:00Z");
const ok = (id: string, over: Partial<OutletDef> = {}): OutletDef => ({
  id, name: id, market: "kr", aliases: [id], feeds: [`https://${id}.example/rss`], via: "rss_direct",
  terms: { verdict: "ok", note: "테스트 매체 메모", checkedOn: "2026-11-14" }, ...over,
});

const harness = (opts: {
  outlets: OutletDef[];
  titles: AiTitle[];
  robots?: Record<string, RobotsSnapshot>;
  feed?: (url: string) => Array<{ title: string; url: string; publishedAt: Date }> | "fail";
  page?: (url: string) => string[] | "fail";
}) => {
  const rows = new Map<string, { status: AiBodyStatus; link: AiBodyLink; attempts: number; paragraphs?: string[] }>();
  const items: RssItem[] = [];
  let synced: OutletRow[] = [];
  const pageCalls: string[] = [];
  const robotsCalls: string[] = [];
  const sources: AiSourceStore = {
    syncOutlets: async (r) => void (synced = r),
    enabledOutletIds: async () => new Set(synced.filter((r) => r.enabled).map((r) => r.id)),
    robots: async () => null,
    saveRobots: async () => {},
    feedState: async () => null,
    saveFeedState: async () => {},
    saveItems: async (xs) => (items.push(...xs), xs.length),
    recentItems: async (ids) => items.filter((i) => ids.includes(i.outletId)),
    pruneItems: async () => 0,
  };
  const bodies: AiBodyStore = {
    statuses: async (keys) => new Map(keys.filter((k) => rows.has(k)).map((k) => [k, rows.get(k)!.status])),
    saveLinks: async (links) => {
      for (const l of links) {
        const cur = rows.get(l.key);
        if (!cur || cur.status === "unmatched" || cur.status === "blocked") rows.set(l.key, { status: l.status, link: l, attempts: 0 });
      }
    },
    dueForFetch: async (limit) =>
      [...rows.values()]
        .filter((r) => r.status === "pending" && r.link.itemUrl && r.link.outletId)
        .slice(0, limit)
        .map((r): AiBodyDue => ({ key: r.link.key, outletId: r.link.outletId!, itemUrl: r.link.itemUrl!, title: r.link.title, attempts: r.attempts })),
    saveFetched: async (key, result) => {
      const r = rows.get(key)!;
      r.status = result.status;
      if (result.status === "ok") r.paragraphs = result.paragraphs;
      if (result.status === "failed") r.attempts = result.attempts;
    },
    pendingExtraction: async () => [],
    saveDisclosures: async () => 0,
    markExtraction: async () => {},
    purgeParagraphs: async () => 0,
  };
  const feeds: OutletFeedPort = {
    fetchFeed: async (url) => {
      const r = opts.feed?.(url) ?? [];
      if (r === "fail") throw new Error("down");
      return { status: "ok", items: r, etag: null, lastModified: null };
    },
    fetchRobots: async (origin) => (robotsCalls.push(origin), opts.robots?.[origin] ?? { status: 404, body: "" }),
  };
  const pages = {
    paragraphs: async (url: string) => {
      pageCalls.push(url);
      const r = opts.page?.(url) ?? ["본문 첫 문단은 충분히 긴 문장으로 끝납니다. 회사는 3분기 영업이익이 182% 늘었다고 밝혔다."];
      if (r === "fail") throw new Error("timeout");
      return r;
    },
  };
  const uc = new CollectAiBodies({ outlets: opts.outlets, titles: { recentTitles: async () => opts.titles }, feeds, pages, sources, bodies }, () => NOW, async () => {});
  return { uc, rows, pageCalls, robotsCalls, synced: () => synced };
};

const t = (key: string, title: string, outletName: string, over: Partial<AiTitle> = {}): AiTitle => ({
  key, market: "kr", title, publishedAt: new Date(NOW.getTime() - 10 * 60_000), outletName, directUrl: null, symbols: ["000001"], ...over,
});

describe("CollectAiBodies", () => {
  it("약관 ok + robots 허락 매체만 켜고, 그 RSS 로 이은 기사를 받는다", async () => {
    const h = harness({
      outlets: [ok("a"), ok("b", { terms: { verdict: "blocks", note: "약관 금지", checkedOn: "2026-11-14" } })],
      titles: [t("kr:1", "가나다 회사 3분기 영업이익 증가", "a"), t("kr:2", "라마바 회사 대표 사임", "b")],
      feed: () => [{ title: "가나다 회사 3분기 영업이익 증가", url: "https://a.example/n/1", publishedAt: NOW }],
    });
    const tick = await h.uc.execute();
    assert.deepEqual(h.synced().map((r) => [r.id, r.enabled]), [["a", true], ["b", false]]);
    assert.equal(h.rows.get("kr:1")?.status, "ok");
    assert.equal(h.rows.get("kr:2")?.status, "blocked");
    assert.deepEqual(h.pageCalls, ["https://a.example/n/1"]);
    assert.equal(tick.fetched.ok, 1);
  });

  it("약관이 막은 매체는 원장 주소가 곧 원문(코인 영문)이어도 꺼진다", async () => {
    const h = harness({
      outlets: [ok("ct", { feeds: [], directSources: ["ct"], via: "coin_rss", terms: { verdict: "blocks", note: "약관 금지", checkedOn: "2026-11-14" } })],
      titles: [t("coin:1", "Bitcoin ETF outflows", "ct", { market: "coin", directUrl: "https://ct.example/a" })],
    });
    await h.uc.execute();
    assert.equal(h.synced()[0]?.enabled, false);
    assert.equal(h.rows.get("coin:1")?.status, "blocked");
    assert.deepEqual(h.pageCalls, []);
  });

  it("robots 가 AI 봇을 막은 매체는 꺼지고 페이지를 받지 않는다", async () => {
    const h = harness({
      outlets: [ok("a")],
      titles: [t("kr:1", "가나다 회사 3분기 영업이익 증가", "a")],
      robots: { "https://a.example": { status: 200, body: "User-agent: ClaudeBot\nDisallow: /" } },
      feed: () => [{ title: "가나다 회사 3분기 영업이익 증가", url: "https://a.example/n/1", publishedAt: NOW }],
    });
    await h.uc.execute();
    assert.equal(h.synced()[0]?.robotsVerdict, "blocked_ai");
    assert.equal(h.rows.get("kr:1")?.status, "blocked");
    assert.deepEqual(h.pageCalls, []);
  });

  it("RSS 는 허락이어도 기사 주소의 origin robots 가 막으면 받지 않는다", async () => {
    const h = harness({
      outlets: [ok("a")],
      titles: [t("kr:1", "가나다 회사 3분기 영업이익 증가", "a")],
      robots: { "https://news.a.example": { status: 200, body: "User-agent: *\nDisallow: /" } },
      feed: () => [{ title: "가나다 회사 3분기 영업이익 증가", url: "https://news.a.example/n/1", publishedAt: NOW }],
    });
    const tick = await h.uc.execute();
    assert.equal(h.rows.get("kr:1")?.status, "robots_blocked");
    assert.equal(tick.fetched.robotsBlocked, 1);
    assert.deepEqual(h.pageCalls, []);
  });

  it("RSS 하나가 죽어도 다른 매체는 이어 간다 · 받기 실패는 재시도 표시", async () => {
    const h = harness({
      outlets: [ok("a"), ok("b")],
      titles: [t("kr:1", "가나다 회사 3분기 영업이익 증가", "a"), t("kr:2", "라마바 회사 대표 사임 발표", "b")],
      feed: (url) => (url.includes("a.example") ? "fail" : [{ title: "라마바 회사 대표 사임 발표", url: "https://b.example/n/2", publishedAt: NOW }]),
      page: () => "fail",
    });
    const tick = await h.uc.execute();
    assert.equal(tick.feeds.failed, 1);
    assert.equal(h.rows.get("kr:1")?.status, "unmatched");
    assert.deepEqual([h.rows.get("kr:2")?.status, h.rows.get("kr:2")?.attempts], ["failed", 1]);
  });

  it("본문이 없으면 empty · 이미 받은 행은 다음 회차에 다시 받지 않는다", async () => {
    const h = harness({
      outlets: [ok("a")],
      titles: [t("kr:1", "가나다 회사 3분기 영업이익 증가", "a")],
      feed: () => [{ title: "가나다 회사 3분기 영업이익 증가", url: "https://a.example/n/1", publishedAt: NOW }],
      page: () => ["짧음"],
    });
    await h.uc.execute();
    assert.equal(h.rows.get("kr:1")?.status, "empty");
    await h.uc.execute();
    assert.equal(h.pageCalls.length, 1);
  });

  it("robots 는 회차 안에서 origin 마다 한 번", async () => {
    const h = harness({
      outlets: [ok("a", { feeds: ["https://a.example/rss1", "https://a.example/rss2"] })],
      titles: [t("kr:1", "가나다 회사 3분기 영업이익 증가", "a"), t("kr:2", "가나다 회사 신규 공급계약 체결", "a")],
      feed: () => [
        { title: "가나다 회사 3분기 영업이익 증가", url: "https://a.example/n/1", publishedAt: NOW },
        { title: "가나다 회사 신규 공급계약 체결", url: "https://a.example/n/2", publishedAt: NOW },
      ],
    });
    await h.uc.execute();
    assert.deepEqual(h.robotsCalls, ["https://a.example"]);
  });
});

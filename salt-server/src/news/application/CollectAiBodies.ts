import { createHash } from "node:crypto";

import {
  AI_BODY_KEEP_MS,
  AI_LINK_WINDOW_MS,
  type AiBodyStore,
  type AiSourceStore,
  type AiTitleSource,
  type ArticlePagePort,
  type OutletDef,
  type OutletFeedPort,
  type OutletRow,
  type RobotsSnapshot,
  cleanParagraphs,
  linkTitle,
  needsLink,
  nextFetchAt,
  outletByAlias,
  robotsVerdictFor,
} from "../domain";
import { logger } from "../../shared/config/logger";

/** robots 를 다시 읽는 주기(FR-1 하루 한 번) */
const ROBOTS_TTL_MS = 24 * 60 * 60 * 1000;
/** 한 회차에 받는 원문 수 상한 — 5분 회차 · 매체마다 초당 1건이면 여유 */
const FETCH_PER_TICK = 60;
/** 매체 하나에서 연달아 받을 때 간격(FR-4 매체마다 초당 1건) */
const PER_OUTLET_GAP_MS = 1_000;
/** 동시에 받는 매체 수 — DB 쓰기도 그만큼만(`workers-external.md` 연결 풀) */
const OUTLET_CONCURRENCY = 3;
/** RSS 항목 보관 — 잇기 창(1일)보다 넉넉히 */
const ITEM_KEEP_MS = 14 * 24 * 60 * 60 * 1000;

export interface AiBodyTick {
  feeds: { polled: number; notModified: number; failed: number; newItems: number };
  linked: { pending: number; unmatched: number; blocked: number; noOutlet: number };
  fetched: { ok: number; empty: number; failed: number; robotsBlocked: number };
  purged: number;
}

/**
 * AI 경로 본문 한 회차(`SRV-REQ-058` FR-1~5) — 매체 판정 → RSS 받기 → 같은 기사 잇기 → 원문 받기 → 오래된 문단 지우기.
 * 포털 검색은 이 경로에 없다(시험이 본다). 단계마다 실패가 다음 단계를 막지 않는다 — 매체 하나 · 기사 하나 단위로 건너뛴다.
 * 트랜잭션 없음(외부 I/O 뒤 짧은 쓰기 — `performance-server.md` §2)
 */
export class CollectAiBodies {
  private readonly byAlias: Map<string, OutletDef>;
  private robotsMemo = new Map<string, Promise<RobotsSnapshot>>();

  constructor(
    private readonly deps: {
      outlets: readonly OutletDef[];
      titles: AiTitleSource;
      feeds: OutletFeedPort;
      pages: ArticlePagePort;
      sources: AiSourceStore;
      bodies: AiBodyStore;
    },
    private readonly now: () => Date = () => new Date(),
    private readonly sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  ) {
    this.byAlias = outletByAlias(deps.outlets);
  }

  async execute(): Promise<AiBodyTick> {
    this.robotsMemo = new Map();
    const enabled = await this.syncOutlets();
    const feeds = await this.pollFeeds(enabled);
    const linked = await this.link(enabled);
    const fetched = await this.fetchBodies();
    const at = this.now();
    const purged = await this.deps.bodies.purgeParagraphs(new Date(at.getTime() - AI_BODY_KEEP_MS), at);
    await this.deps.sources.pruneItems(new Date(at.getTime() - ITEM_KEEP_MS));
    return { feeds, linked, fetched, purged };
  }

  /** 약관 판정 + robots(RSS 주소 전부가 허락해야) → 켜짐. 표를 목록 그대로 다시 쓴다 */
  private async syncOutlets(): Promise<Set<string>> {
    const rows: OutletRow[] = [];
    for (const o of this.deps.outlets) {
      const robotsVerdict = o.terms.verdict === "ok" ? await this.feedRobotsVerdict(o) : "no_feed";
      rows.push({
        id: o.id,
        name: o.name,
        market: o.market,
        enabled: o.terms.verdict === "ok" && (robotsVerdict === "allowed" || (robotsVerdict === "no_feed" && (o.directSources?.length ?? 0) > 0)),
        robotsVerdict,
        termsVerdict: o.terms.verdict,
        termsNote: o.terms.note,
      });
    }
    await this.deps.sources.syncOutlets(rows, this.now());
    return new Set(rows.filter((r) => r.enabled).map((r) => r.id));
  }

  private async feedRobotsVerdict(o: OutletDef): Promise<OutletRow["robotsVerdict"]> {
    if (o.feeds.length === 0) return "no_feed";
    for (const url of o.feeds) {
      const verdict = robotsVerdictFor(await this.robotsFor(url), url);
      if (verdict !== "allowed") return verdict;
    }
    return "allowed";
  }

  /** 주소의 origin robots — 하루 안이면 저장본, 아니면 받아 저장. 회차 안에선 한 번만 */
  private robotsFor(url: string): Promise<RobotsSnapshot> {
    const origin = new URL(url).origin;
    let memo = this.robotsMemo.get(origin);
    if (!memo) {
      memo = (async () => {
        const cached = await this.deps.sources.robots(origin);
        if (cached && this.now().getTime() - cached.fetchedAt.getTime() < ROBOTS_TTL_MS) return cached.snapshot;
        const fresh = await this.deps.feeds.fetchRobots(origin);
        await this.deps.sources.saveRobots(origin, fresh, this.now());
        return fresh;
      })();
      this.robotsMemo.set(origin, memo);
    }
    return memo;
  }

  private async pollFeeds(enabled: Set<string>): Promise<AiBodyTick["feeds"]> {
    const out = { polled: 0, notModified: 0, failed: 0, newItems: 0 };
    for (const o of this.deps.outlets) {
      if (!enabled.has(o.id)) continue;
      for (const url of o.feeds) {
        out.polled += 1;
        try {
          const res = await this.deps.feeds.fetchFeed(url, await this.deps.sources.feedState(url));
          if (res.status === "not_modified") {
            out.notModified += 1;
            await this.deps.sources.saveFeedState(url, o.id, { etag: null, lastModified: null, status: "not_modified" }, this.now());
            continue;
          }
          out.newItems += await this.deps.sources.saveItems(
            res.items.map((i) => ({ ...i, outletId: o.id })),
            this.now(),
          );
          await this.deps.sources.saveFeedState(url, o.id, { etag: res.etag, lastModified: res.lastModified, status: "ok" }, this.now());
        } catch (error) {
          out.failed += 1;
          logger.warn("[news] ai-body feed failed", { outlet: o.id, url, message: String((error as Error).message ?? "").slice(0, 120) });
        }
      }
    }
    return out;
  }

  private async link(enabled: Set<string>): Promise<AiBodyTick["linked"]> {
    const now = this.now();
    const titles = await this.deps.titles.recentTitles(new Date(now.getTime() - AI_LINK_WINDOW_MS));
    const statuses = await this.deps.bodies.statuses(titles.map((t) => t.key));
    const todo = titles.filter((t) => needsLink(statuses.get(t.key) ?? null, t.publishedAt, now));
    const items = await this.deps.sources.recentItems([...enabled], new Date(now.getTime() - 3 * AI_LINK_WINDOW_MS));
    const links = todo.map((t) => {
      const outlet = t.outletName ? this.byAlias.get(t.outletName.toLowerCase()) : undefined;
      return linkTitle(t, outlet, outlet ? enabled.has(outlet.id) : false, items);
    });
    await this.deps.bodies.saveLinks(links, now);
    const count = (s: string) => links.filter((l) => l.status === s).length;
    return { pending: count("pending"), unmatched: count("unmatched"), blocked: count("blocked"), noOutlet: count("no_outlet") };
  }

  /** 받을 행을 매체별로 묶어 매체 안은 1초 간격 · 매체 셋까지 동시에 */
  private async fetchBodies(): Promise<AiBodyTick["fetched"]> {
    const out = { ok: 0, empty: 0, failed: 0, robotsBlocked: 0 };
    const due = await this.deps.bodies.dueForFetch(FETCH_PER_TICK, this.now());
    const byOutlet = new Map<string, typeof due>();
    for (const d of due) byOutlet.set(d.outletId, [...(byOutlet.get(d.outletId) ?? []), d]);
    const groups = [...byOutlet.values()];
    const run = async (rows: typeof due) => {
      for (const [i, row] of rows.entries()) {
        if (i > 0) await this.sleep(PER_OUTLET_GAP_MS);
        const result = await this.fetchOne(row);
        out[result === "robots_blocked" ? "robotsBlocked" : result] += 1;
      }
    };
    for (let i = 0; i < groups.length; i += OUTLET_CONCURRENCY) {
      await Promise.all(groups.slice(i, i + OUTLET_CONCURRENCY).map(run));
    }
    return out;
  }

  private async fetchOne(row: Awaited<ReturnType<AiBodyStore["dueForFetch"]>>[number]) {
    const at = this.now();
    try {
      if (robotsVerdictFor(await this.robotsFor(row.itemUrl), row.itemUrl) !== "allowed") {
        await this.deps.bodies.saveFetched(row.key, { status: "robots_blocked" }, at);
        return "robots_blocked" as const;
      }
      const paragraphs = cleanParagraphs(await this.deps.pages.paragraphs(row.itemUrl, false), row.title);
      if (paragraphs.length === 0) {
        await this.deps.bodies.saveFetched(row.key, { status: "empty" }, at);
        return "empty" as const;
      }
      const joined = paragraphs.join("\n");
      const hash = createHash("sha256").update(joined).digest("hex");
      await this.deps.bodies.saveFetched(row.key, { status: "ok", paragraphs, hash, chars: joined.length }, at);
      return "ok" as const;
    } catch (error) {
      const attempts = row.attempts + 1;
      logger.warn("[news] ai-body fetch failed", { key: row.key, outlet: row.outletId, attempts, message: String((error as Error).message ?? "").slice(0, 120) });
      await this.deps.bodies.saveFetched(row.key, { status: "failed", attempts, nextTryAt: nextFetchAt(attempts, at) }, at);
      return "failed" as const;
    }
  }
}

import Parser from "rss-parser";

import { createHttpClient } from "../../shared/infrastructure/httpClient";
import type { OutletFeedPort, OutletFeedResult, RobotsSnapshot } from "../domain";
import { guardRedirect, isAllowedTarget, publicAgents } from "./ArticlePageFetcher";

/** 받는 RSS · robots 상한 */
const MAX_BYTES = 2 * 1024 * 1024;
/** 우리 이름 — robots 판정 토큰(`AI_ROBOTS_TOKENS` 의 `saltreader`)과 같다 */
const USER_AGENT = "Mozilla/5.0 (compatible; SaltReader/1.0)";

/**
 * 매체 RSS · robots.txt 받기(`SRV-REQ-058` FR-1 · FR-2) — 조건부 GET(ETag · Last-Modified) · 8초 · 2MB · 리다이렉트 3번(공인 주소만).
 * 항목은 제목 · 주소 · 게시 시각만 남긴다(설명 · 본문 0). 게시 시각이 없거나 틀린 항목은 버린다(같은 기사 판정이 시각 창을 쓴다)
 */
export class OutletFeedClient implements OutletFeedPort {
  private readonly http = createHttpClient({ timeoutMs: 8_000, headers: { "User-Agent": USER_AGENT } });
  private readonly parser = new Parser();
  private readonly agents = publicAgents();

  async fetchFeed(url: string, state: { etag: string | null; lastModified: string | null } | null): Promise<OutletFeedResult> {
    const parsed = new URL(url);
    if (!isAllowedTarget(parsed.protocol, parsed.hostname)) throw new Error("blocked target");
    const headers: Record<string, string> = { Accept: "application/rss+xml, application/xml, text/xml" };
    if (state?.etag) headers["If-None-Match"] = state.etag;
    if (state?.lastModified) headers["If-Modified-Since"] = state.lastModified;
    const res = await this.http.get<string>(url, {
      ...this.agents,
      headers,
      responseType: "text",
      maxContentLength: MAX_BYTES,
      maxRedirects: 3,
      beforeRedirect: guardRedirect,
      validateStatus: (s) => s === 304 || (s >= 200 && s < 300),
    });
    if (res.status === 304) return { status: "not_modified" };
    const feed = await this.parser.parseString(res.data);
    const items = (feed.items ?? []).flatMap((i) => {
      const link = (i.link ?? "").trim();
      const title = (i.title ?? "").replace(/\s+/g, " ").trim();
      const publishedAt = new Date(i.isoDate ?? i.pubDate ?? "");
      if (!link || !title || Number.isNaN(publishedAt.getTime())) return [];
      try {
        const u = new URL(link);
        if (!isAllowedTarget(u.protocol, u.hostname)) return [];
      } catch {
        return [];
      }
      return [{ title, url: link, publishedAt }];
    });
    const header = (name: string) => {
      const v = res.headers[name];
      return typeof v === "string" && v.length > 0 ? v : null;
    };
    return { status: "ok", items, etag: header("etag"), lastModified: header("last-modified") };
  }

  async fetchRobots(origin: string): Promise<RobotsSnapshot> {
    try {
      const res = await this.http.get<string>(`${origin}/robots.txt`, {
        ...this.agents,
        responseType: "text",
        maxContentLength: MAX_BYTES,
        maxRedirects: 3,
        beforeRedirect: guardRedirect,
        validateStatus: () => true,
      });
      return { status: res.status, body: res.status >= 200 && res.status < 300 ? String(res.data ?? "") : "" };
    } catch {
      return { status: 0, body: "" };
    }
  }
}

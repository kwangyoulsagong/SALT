import type { MarketApi } from "../../market/application/api";
import type { NewsApi } from "../../news/application/api";
import type { FactSourceBody, FactSourceReader } from "../domain";

/**
 * 사실 추출 재료 ACL — `news` 의 AI 경로 본문(포털 본문은 이 길에 없다 · `SRV-REQ-058` FR-5)과 `market` 의 사건 종류 사전.
 * 이름은 가져오는 것(`ddd-infrastructure.md` §5)
 */
export class FactSourceAdapter implements FactSourceReader {
  constructor(
    private readonly news: NewsApi,
    private readonly market: MarketApi,
  ) {}

  async pending(limit: number): Promise<FactSourceBody[]> {
    const rows = await this.news.aiBodiesForExtraction(limit);
    return rows.map((r) => ({
      key: r.key,
      market: r.market,
      title: r.title,
      publishedAt: r.publishedAt,
      fetchedAt: r.fetchedAt,
      symbols: r.symbols,
      url: r.url,
      sourceName: r.outletName,
      paragraphs: r.paragraphs,
      // 포털은 이 길에 없다(`aiBodiesForExtraction` 이 거른다) — 타입을 좁힐 뿐
      via: r.via === "portal" ? "rss_direct" : r.via,
    }));
  }

  mark(key: string, outcome: "done" | "failed", at: Date) {
    return this.news.markAiBodyExtraction(key, outcome, at);
  }

  kindsOf(market: "kr" | "coin", origin: "news" | "disclosure", items: ReadonlyArray<{ title: string; codes: number }>) {
    return this.market.newsKindsOf(market === "kr" ? "kr" : "crypto", origin, items);
  }
}

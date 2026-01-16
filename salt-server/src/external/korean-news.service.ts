import Parser from "rss-parser";
import { logger } from "../config/logger";

export interface KoreanNewsItem {
  title: string;
  content: string;
  summary: string;
  url: string;
  imageUrl?: string;
  source: string;
  author?: string;
  symbols: string[];
  sentiment?: string;
  publishedAt: Date;
}

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
  },
});

export class KoreanNewsService {
  // ✅ “전체 뉴스” 커버용 broad 키워드 세트
  private keywords = [
    "가상화폐",
    "암호화폐",
    "코인",
    "비트코인",
    "이더리움",
    "알트코인",
    "블록체인",
    "거래소",
    "업비트",
    "빗썸",
  ];

  async fetchAllKoreanNews(): Promise<KoreanNewsItem[]> {
    logger.info("🇰🇷 Fetching Korean crypto news (broad RSS)...");

    // 키워드 별 RSS URL 만들기
    const rssUrls = this.keywords.map((kw) => ({
      name: `GoogleNews(${kw})`,
      url: this.buildGoogleNewsRssUrl(kw),
    }));

    const results = await Promise.allSettled(
      rssUrls.map((src) => this.fetchFromRss(src.name, src.url))
    );

    const merged: KoreanNewsItem[] = [];
    results.forEach((r) => {
      if (r.status === "fulfilled") merged.push(...r.value);
      else logger.error("RSS fetch failed:", r.reason);
    });

    // ✅ 중복 제거 (url 기준)
    const uniq = new Map<string, KoreanNewsItem>();
    for (const item of merged) {
      if (!item.url) continue;
      if (!uniq.has(item.url)) uniq.set(item.url, item);
    }

    const final = [...uniq.values()].sort(
      (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()
    );

    logger.info(`✅ Fetched ${final.length} Korean news articles (broad RSS)`);
    return final;
  }

  private buildGoogleNewsRssUrl(keyword: string) {
    // 한국 뉴스 RSS 검색
    // hl=ko&gl=KR&ceid=KR:ko -> 한국 설정
    const q = encodeURIComponent(keyword);
    return `https://news.google.com/rss/search?q=${q}&hl=ko&gl=KR&ceid=KR:ko`;
  }

  private async fetchFromRss(sourceName: string, url: string) {
    try {
      const feed = await parser.parseURL(url);

      const items: KoreanNewsItem[] = [];

      for (const entry of feed.items.slice(0, 30)) {
        const title = entry.title?.trim() ?? "";
        const link = entry.link?.trim() ?? "";
        const publishedAt = entry.isoDate
          ? new Date(entry.isoDate)
          : new Date();
        const summary =
          (entry.contentSnippet || entry.content || "").toString().trim() ||
          title;

        if (!title || !link) continue;

        items.push({
          title,
          content: summary,
          summary: this.extractSummary(summary),
          url: link,
          source: sourceName,
          symbols: this.extractSymbols(title + " " + summary),
          sentiment: this.analyzeSentiment(title + " " + summary),
          publishedAt,
        });
      }

      logger.info(`✅ ${sourceName}: ${items.length} items`);
      return items;
    } catch (error: any) {
      logger.error(`❌ ${sourceName} RSS error`, {
        message: error?.message,
        code: error?.code,
      });
      return [];
    }
  }

  private extractSymbols(text: string): string[] {
    const symbols = new Set<string>();
    const symbolMap: { [key: string]: string } = {
      비트코인: "BTC",
      이더리움: "ETH",
      리플: "XRP",
      솔라나: "SOL",
      카르다노: "ADA",
      폴카닷: "DOT",
      도지코인: "DOGE",
      시바이누: "SHIB",
      트론: "TRX",
      체인링크: "LINK",
      라이트코인: "LTC",
      폴리곤: "MATIC",
      아발란체: "AVAX",
      니어: "NEAR",
      앱토스: "APT",
      수이: "SUI",
      셀레스티아: "TIA",
    };

    for (const [korean, symbol] of Object.entries(symbolMap)) {
      if (text.includes(korean)) symbols.add(symbol);
    }

    const matches = text.match(/\b[A-Z]{3,5}\b/g);
    matches?.forEach((m) => symbols.add(m));

    return [...symbols];
  }

  private analyzeSentiment(text: string): string {
    const positive = [
      "상승",
      "급등",
      "호재",
      "긍정",
      "강세",
      "돌파",
      "최고가",
      "신고가",
    ];
    const negative = [
      "하락",
      "급락",
      "악재",
      "부정",
      "약세",
      "폭락",
      "최저가",
      "위험",
    ];

    const p = positive.filter((w) => text.includes(w)).length;
    const n = negative.filter((w) => text.includes(w)).length;

    if (p > n) return "positive";
    if (n > p) return "negative";
    return "neutral";
  }

  private extractSummary(text: string): string {
    return text.slice(0, 140) + (text.length > 140 ? "..." : "");
  }
}

export const koreanNewsService = new KoreanNewsService();

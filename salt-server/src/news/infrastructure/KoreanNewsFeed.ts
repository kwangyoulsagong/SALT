import Parser from "rss-parser";

import { logger } from "../../shared/config/logger";
import { NEWS_GAP_PER_FEED, nextIsoDay, type ArticleDraft, type ArticleSentiment, type NewsDayResult } from "../domain";

/**
 * 한글 뉴스 수집 — `external/korean-news.service.ts` 에서 옮겨왔다.
 *
 * > **`source` 가 `GoogleNews(키워드)` 다.** `domain/NewsSource.ts` 의 한글 소스 목록과
 * > 어긋나 있고, 그 사실을 그 파일에 적어 뒀다. 여기서 이름을 바꾸면 **이미 저장된
 * > 기사들과 새 기사들의 소스가 갈라진다** — 이관에서 할 일이 아니다.
 */

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
  },
});

/** RSS 한 번 받기 — 테스트가 갈아 끼운다. 실패는 던진다 */
type FeedLoader = (url: string) => Promise<{ items: Parser.Item[] }>;

/** 날짜 다시 검색의 요청 간격(≈1건/s) — 정기 회차 10건과 달리 최대 150건이라 한꺼번에 보내지 않는다 */
const GAP_PACE_MS = 1_000;

/** 검색 RSS 주소 — 한국 설정(hl=ko&gl=KR&ceid=KR:ko) */
export const googleNewsRssUrl = (query: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;

/** 하루치 다시 검색 주소(`SRV-REQ-057` FR-8) — `키워드 after:그날 before:다음날` */
export const googleNewsDayUrl = (keyword: string, day: string) =>
  googleNewsRssUrl(`${keyword} after:${day} before:${nextIsoDay(day)}`);

export class KoreanNewsFeed {
  constructor(
    private readonly load: FeedLoader = (url) => parser.parseURL(url),
    private readonly sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  ) {}

  // ✅ “전체 뉴스” 커버용 broad 키워드 세트
  readonly keywords = [
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

  async fetchAllKoreanNews(): Promise<ArticleDraft[]> {
    logger.info("🇰🇷 Fetching Korean crypto news (broad RSS)...");

    // 키워드 별 RSS URL 만들기
    const rssUrls = this.keywords.map((kw) => ({
      name: `GoogleNews(${kw})`,
      url: googleNewsRssUrl(kw),
    }));

    const results = await Promise.allSettled(
      rssUrls.map((src) => this.fetchFromRss(src.name, src.url))
    );

    const merged: ArticleDraft[] = [];
    results.forEach((r) => {
      if (r.status === "fulfilled") merged.push(...r.value);
      else logger.error("RSS fetch failed:", r.reason);
    });

    // ✅ 중복 제거 (url 기준)
    const uniq = new Map<string, ArticleDraft>();
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

  /**
   * 하루치 다시 검색(`SRV-REQ-057` FR-8) — 키워드마다 차례로 · 요청 사이 1초. `source` 는 정기 회차와 같은 `GoogleNews(키워드)`
   * (소식 실험의 출처 정의가 그대로다). 실패한 키워드는 건너뛰고 수를 센다 — 부르는 쪽이 "다 받았나"로 마지막 성공을 옮길지 정한다
   */
  async fetchKoreanDay(day: string): Promise<NewsDayResult> {
    const items: ArticleDraft[] = [];
    let failed = 0;
    for (const [i, kw] of this.keywords.entries()) {
      if (i > 0) await this.sleep(GAP_PACE_MS);
      try {
        items.push(...(await this.readFeed(`GoogleNews(${kw})`, googleNewsDayUrl(kw, day), NEWS_GAP_PER_FEED)));
      } catch (error: any) {
        failed++;
        logger.warn(`[news] gap ${day} ${kw} 실패`, { message: String(error?.message ?? "").slice(0, 120), code: error?.code ?? null });
      }
    }
    const uniq = new Map<string, ArticleDraft>();
    for (const item of items) if (!uniq.has(item.url)) uniq.set(item.url, item);
    return { items: [...uniq.values()], failed };
  }

  private async fetchFromRss(sourceName: string, url: string) {
    try {
      const items = await this.readFeed(sourceName, url, 30);
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

  /** 받아서 기사 초안으로 — 정기 · 다시 검색이 같은 변환(종목 · 감성 · 요약)을 쓴다. 실패는 던진다 */
  private async readFeed(sourceName: string, url: string, limit: number): Promise<ArticleDraft[]> {
    const feed = await this.load(url);

    const items: ArticleDraft[] = [];

    for (const entry of feed.items.slice(0, limit)) {
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

    return items;
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

  private analyzeSentiment(text: string): ArticleSentiment {
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

export const koreanNewsFeed = new KoreanNewsFeed();

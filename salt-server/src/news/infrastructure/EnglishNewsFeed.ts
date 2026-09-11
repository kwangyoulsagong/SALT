import axios from "axios";
import Parser from "rss-parser";

import { logger } from "../../shared/config/logger";
import type { ArticleDraft } from "../domain";

/**
 * 영문 뉴스 수집 — `external/news-api.service.ts` 에서 옮겨왔다.
 *
 * `news` 컨텍스트의 `infrastructure` 다. 이 클래스는 **도메인 타입(`ArticleDraft`)으로
 * 번역해서 돌려주는 것**이 일이고, RSS 필드 이름이나 CryptoPanic 응답 모양은 여기서 끝난다.
 *
 * 소스 하나가 실패해도 **빈 배열**을 준다(원문 그대로). 한 곳의 장애가 회차 전체를
 * 날리지 않게 하는 것이 이 계약의 목적이다.
 */
class EnglishNewsFeed {
  private rssParser = new Parser();

  /**
   * CryptoPanic API (무료)
   */
  async fetchCryptoPanicNews(limit: number = 20): Promise<ArticleDraft[]> {
    try {
      // CryptoPanic API는 무료 tier 사용 가능
      // 실제로는 API 키 필요: https://cryptopanic.com/developers/api/
      const url = `https://cryptopanic.com/api/v1/posts/?auth_token=free&public=true&kind=news`;

      const response = await axios.get(url);
      const articles = response.data.results || [];

      return articles.slice(0, limit).map((article: any) => ({
        title: article.title,
        content: article.title, // CryptoPanic은 전체 내용 제공 안함
        summary: article.title,
        url: article.url,
        imageUrl: article.metadata?.image || undefined,
        source: "cryptopanic",
        author: article.source?.title || "CryptoPanic",
        symbols: this.extractSymbols(article.currencies || []),
        sentiment: this.analyzeSentiment(article.votes || {}),
        publishedAt: new Date(article.published_at),
      }));
    } catch (error: any) {
      logger.error("CryptoPanic API error:", error.message);
      return [];
    }
  }

  /**
   * CoinDesk RSS 크롤링
   */
  async fetchCoinDeskRSS(): Promise<ArticleDraft[]> {
    try {
      const feed = await this.rssParser.parseURL(
        "https://www.coindesk.com/arc/outboundfeeds/rss/"
      );

      return feed.items.map((item) => ({
        title: item.title || "No title",
        content: item.contentSnippet || item.content || "",
        summary: item.contentSnippet || "",
        url: item.link || "",
        imageUrl: item.enclosure?.url || undefined,
        source: "coindesk",
        author: item.creator || "CoinDesk",
        symbols: this.detectSymbolsFromText(
          item.title + " " + item.contentSnippet
        ),
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      }));
    } catch (error: any) {
      logger.error("CoinDesk RSS error:", error.message);
      return [];
    }
  }

  /**
   * Cointelegraph RSS 크롤링
   */
  async fetchCointelegraphRSS(): Promise<ArticleDraft[]> {
    try {
      const feed = await this.rssParser.parseURL(
        "https://cointelegraph.com/rss"
      );

      return feed.items.slice(0, 20).map((item) => ({
        title: item.title || "No title",
        content: item.contentSnippet || item.content || "",
        summary: item.contentSnippet || "",
        url: item.link || "",
        imageUrl: item.enclosure?.url || undefined,
        source: "cointelegraph",
        author: item.creator || "Cointelegraph",
        symbols: this.detectSymbolsFromText(
          item.title + " " + item.contentSnippet
        ),
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      }));
    } catch (error: any) {
      logger.error("Cointelegraph RSS error:", error.message);
      return [];
    }
  }

  /**
   * CryptoSlate RSS 크롤링
   */
  async fetchCryptoSlateRSS(): Promise<ArticleDraft[]> {
    try {
      const feed = await this.rssParser.parseURL(
        "https://cryptoslate.com/feed/"
      );

      return feed.items.slice(0, 20).map((item) => ({
        title: item.title || "No title",
        content: item.contentSnippet || item.content || "",
        summary: item.contentSnippet || "",
        url: item.link || "",
        imageUrl: undefined,
        source: "cryptoslate",
        author: item.creator || "CryptoSlate",
        symbols: this.detectSymbolsFromText(
          item.title + " " + item.contentSnippet
        ),
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      }));
    } catch (error: any) {
      logger.error("CryptoSlate RSS error:", error.message);
      return [];
    }
  }

  /**
   * 모든 뉴스 소스 통합 수집
   */
  async fetchAllNews(): Promise<ArticleDraft[]> {
    logger.info("📰 Fetching news from all sources...");

    const [cryptoPanic, coinDesk, cointelegraph, cryptoSlate] =
      await Promise.all([
        this.fetchCryptoPanicNews(),
        this.fetchCoinDeskRSS(),
        this.fetchCointelegraphRSS(),
        this.fetchCryptoSlateRSS(),
      ]);

    const allNews: ArticleDraft[] = [
      ...cryptoPanic,
      ...coinDesk,
      ...cointelegraph,
      ...cryptoSlate,
    ];

    logger.info(`✅ Fetched ${allNews.length} news articles`);
    return allNews;
  }

  /**
   * 텍스트에서 암호화폐 심볼 감지
   */
  private detectSymbolsFromText(text: string): string[] {
    const symbols = new Set<string>();
    const commonCryptos = [
      "BTC",
      "Bitcoin",
      "ETH",
      "Ethereum",
      "XRP",
      "Ripple",
      "SOL",
      "Solana",
      "ADA",
      "Cardano",
      "DOGE",
      "Dogecoin",
      "DOT",
      "Polkadot",
      "MATIC",
      "Polygon",
      "LINK",
      "Chainlink",
      "UNI",
      "Uniswap",
    ];

    for (const crypto of commonCryptos) {
      const regex = new RegExp(`\\b${crypto}\\b`, "gi");
      if (regex.test(text)) {
        // 심볼만 추출 (BTC, ETH 등)
        const symbol =
          crypto.length <= 5
            ? crypto.toUpperCase()
            : crypto.substring(0, 3).toUpperCase();
        symbols.add(symbol);
      }
    }

    return Array.from(symbols);
  }

  /**
   * CryptoPanic currencies 배열에서 심볼 추출
   */
  private extractSymbols(currencies: any[]): string[] {
    return currencies.map((c) => c.code.toUpperCase()).slice(0, 5);
  }

  /**
   * 감정 분석 (CryptoPanic votes 기반)
   */
  private analyzeSentiment(
    votes: any
  ): "positive" | "neutral" | "negative" | undefined {
    if (!votes) return undefined;

    const positive = votes.positive || 0;
    const negative = votes.negative || 0;
    const total = positive + negative;

    if (total === 0) return "neutral";
    if (positive > negative * 1.5) return "positive";
    if (negative > positive * 1.5) return "negative";
    return "neutral";
  }
}

export const englishNewsFeed = new EnglishNewsFeed();

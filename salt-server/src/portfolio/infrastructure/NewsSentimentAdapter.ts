import type { NewsApi } from "../../news/application/api";
import type { NewsSentimentSource } from "../domain";

/** `news` 기사 감성 수를 우리 언어로(ACL) — 레이더 뉴스 축(F006 G절) */
export class NewsSentimentAdapter implements NewsSentimentSource {
  constructor(private readonly news: NewsApi) {}

  sentimentCounts(symbols: string[], since: Date) {
    return this.news.sentimentCounts(symbols, since);
  }
}

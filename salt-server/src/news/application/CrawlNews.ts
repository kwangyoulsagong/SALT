import { logger } from "../../shared/config/logger";
import type { ArticleDraft, ArticleRepository, NewsFeedPort } from "../domain";

export interface CrawlResult {
  savedCount: number;
  skippedCount: number;
  total: number;
  english: number;
  korean: number;
}

/**
 * 뉴스 수집 (영문 + 한글).
 *
 * ## 트랜잭션을 걸지 않는다
 *
 * FR-42 — **외부 I/O 를 트랜잭션 안에 넣지 않는다.** 수집은 수백 건을 한 건씩 저장하고
 * 중간에 한 건이 실패해도 나머지는 살아야 한다. 한 트랜잭션으로 묶으면 소스 하나의
 * 일시적 오류가 그 회차 전체를 되돌린다.
 */
export class CrawlNews {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly feed: NewsFeedPort
  ) {}

  async execute(): Promise<CrawlResult> {
    logger.info("🔄 Starting news crawling (English + Korean)...");

    const [english, korean] = await Promise.all([
      this.feed.fetchEnglish(),
      this.feed.fetchKorean(),
    ]);

    const { savedCount, skippedCount } = await saveAll(this.articles, [
      ...english,
      ...korean,
    ]);

    logger.info(
      `✅ News crawling completed: ${savedCount} saved, ${skippedCount} skipped`
    );
    logger.info(`📊 English: ${english.length}, Korean: ${korean.length}`);

    return {
      savedCount,
      skippedCount,
      total: english.length + korean.length,
      english: english.length,
      korean: korean.length,
    };
  }
}

/** 한글 뉴스만. 한글 소스 장애를 따로 재시도할 때 쓴다. */
export class CrawlKoreanNews {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly feed: NewsFeedPort
  ) {}

  async execute() {
    logger.info("🇰🇷 Starting Korean news crawling...");

    const korean = await this.feed.fetchKorean();
    const { savedCount, skippedCount } = await saveAll(this.articles, korean);

    logger.info(
      `✅ Korean news crawling completed: ${savedCount} saved, ${skippedCount} skipped`
    );

    return { savedCount, skippedCount, total: korean.length };
  }
}

/**
 * 한 건의 실패가 회차를 멈추지 않는다.
 *
 * 실패는 저장도 스킵도 아니다 — 원문과 같이 **어느 쪽으로도 세지 않는다.**
 * 두 수의 합이 `total` 보다 작으면 그 차이가 실패 건수다.
 */
const saveAll = async (articles: ArticleRepository, drafts: ArticleDraft[]) => {
  let savedCount = 0;
  let skippedCount = 0;

  for (const draft of drafts) {
    try {
      const saved = await articles.saveIfNew(draft);
      if (saved) savedCount++;
      else skippedCount++;
    } catch (error: any) {
      logger.error(`Failed to save news: ${draft.url}`, error.message);
    }
  }

  return { savedCount, skippedCount };
};

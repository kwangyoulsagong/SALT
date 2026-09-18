import { contextUseCases } from "../composition";
import { logger } from "../shared/config/logger";

/**
 * 워커는 **스케줄만** 갖는다 (FR-5). 수집 절차는 `news` 컨텍스트의 유스케이스이고,
 * 같은 유스케이스를 관리자 HTTP(`POST /api/news/admin/crawl`)도 부른다.
 */
const crawlNewsUseCase = contextUseCases.news.crawlNews;

class NewsCrawlerWorker {
  private crawlInterval: NodeJS.Timeout | null = null;

  async start() {
    logger.info('📰 News Crawler Worker started');

    // 시작 시 한번 실행
    await this.crawlNews();

    // 1시간마다 크롤링
    this.crawlInterval = setInterval(
      async () => {
        await this.crawlNews();
      },
      60 * 60 * 1000 // 1시간
    );

    logger.info('✅ News Crawler Worker running (interval: 1 hour)');
  }

  private async crawlNews() {
    try {
      logger.info('🔄 Starting news crawling...');
      const result = await crawlNewsUseCase.execute();
      logger.info(
        `✅ News crawling completed: ${result.savedCount} saved, ${result.skippedCount} skipped`
      );
    } catch (error: any) {
      logger.error('❌ News crawling failed:', error.message);
    }
  }

  stop() {
    if (this.crawlInterval) {
      clearInterval(this.crawlInterval);
      logger.info('News Crawler Worker stopped');
    }
  }
}

const worker = new NewsCrawlerWorker();

// 시작
worker.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM: Stopping News Crawler Worker');
  worker.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT: Stopping News Crawler Worker');
  worker.stop();
  process.exit(0);
});

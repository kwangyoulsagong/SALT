import { NewsService } from '../modules/news/news.service';
import { logger } from '../config/logger';

const newsService = new NewsService();

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
      const result = await newsService.crawlAndSaveNews();
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

import { contextUseCases } from "../composition";
import { logger } from "../shared/config/logger";
import { onWake, startWakeWatch } from "../shared/infrastructure/wake";

/**
 * 워커는 **스케줄만** 갖는다 (FR-5). 수집 절차는 `news` 컨텍스트의 유스케이스이고,
 * 같은 유스케이스를 관리자 HTTP(`POST /api/news/admin/crawl`)도 부른다.
 */
const crawlNewsUseCase = contextUseCases.news.crawlNews;
const collectAiBodies = contextUseCases.news.collectAiBodies;

/** AI 경로 본문 회차 간격(`SRV-REQ-058` FR-2 — 매체 RSS 5분) */
const AI_BODY_INTERVAL_MS = 5 * 60 * 1000;

class NewsCrawlerWorker {
  private crawlInterval: NodeJS.Timeout | null = null;
  private aiBodyInterval: NodeJS.Timeout | null = null;
  private aiBodyRunning = false;

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

    // AI 경로 본문 — 첫 회차는 기사 수집 뒤(오늘 코인 제목이 들어온 다음). 앞 회차가 길면 겹쳐 돌지 않는다
    void this.collectAiBodies();
    this.aiBodyInterval = setInterval(() => void this.collectAiBodies(), AI_BODY_INTERVAL_MS);

    // 깨면 바로 한 번(SRV-REQ-057 FR-6) — 1시간 타이머는 자는 동안 멈춰 깬 뒤 최대 1시간 비었다(11-11 04:27 → 08:27 깸 뒤 무수집)
    onWake('news-crawl', () => this.crawlNews());
    onWake('news-ai-body', () => this.collectAiBodies());
    startWakeWatch();

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

  private async collectAiBodies() {
    if (this.aiBodyRunning) return;
    this.aiBodyRunning = true;
    try {
      const tick = await collectAiBodies.execute();
      logger.info('[news] ai-body tick', tick);
    } catch (error: any) {
      logger.error('[news] ai-body tick failed', { message: String(error?.message ?? '').slice(0, 200) });
    } finally {
      this.aiBodyRunning = false;
    }
  }

  stop() {
    if (this.aiBodyInterval) clearInterval(this.aiBodyInterval);
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

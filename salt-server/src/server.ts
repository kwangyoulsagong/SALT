import app from './app';
import { env } from './shared/config/env';
import { logger } from './shared/config/logger';
import { connectDatabase, disconnectDatabase } from './shared/infrastructure/prisma';

const PORT = env.PORT;

async function startServer() {
  try {
    // Database 연결
    await connectDatabase();

    // 서버 시작
    // Express 5 는 listen 실패(EADDRINUSE 등)도 이 콜백으로 준다. 무시하면 HTTP 없이 워커만 도는 프로세스가 남는다 —
    // launchd 재시작 때 이전 프로세스가 아직 포트를 쥐고 있으면 그렇게 됐다(2026-10-23). 끝내고 launchd 가 다시 띄우게 한다
    app.listen(PORT, (error?: Error) => {
      if (error) {
        logger.error(`❌ 포트 ${PORT} 를 열지 못했다 — 종료한다: ${error.message}`);
        process.exit(1);
      }
      logger.info(`🚀 Server is running on port ${PORT}`);
      logger.info(`📍 Environment: ${env.NODE_ENV}`);
      logger.info(`🔗 API URL: http://localhost:${PORT}`);
      logger.info(`📚 API Docs: http://localhost:${PORT}/api-docs`);
      logger.info(`💾 Database: PostgreSQL`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info(`${signal} signal received: closing server gracefully`);
  await disconnectDatabase();
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Exception handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

startServer();

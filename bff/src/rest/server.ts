import app from './app';
import { env } from '../config/env';
import { logger } from '../config/logger';

const PORT = env.REST_PORT;

app.listen(PORT, () => {
  logger.info(`🚀 BFF REST API Server is running on port ${PORT}`);
  logger.info(`📍 Environment: ${env.NODE_ENV}`);
  logger.info(`🔗 API URL: http://localhost:${PORT}`);
  logger.info(`💾 Backend: ${env.BACKEND_API_URL}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing server gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing server gracefully');
  process.exit(0);
});

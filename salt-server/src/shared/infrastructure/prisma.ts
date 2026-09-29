import { PrismaClient } from "@prisma/client";
import { logger } from "../config/logger";

// 쿼리 로그는 기본으로 끈다. 시세 갱신마다 전 쿼리가 찍혀 로그가 하루 수십 GB로 불어난다.
// 필요할 때만 PRISMA_LOG_QUERIES=1 로 켠다.
const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? process.env.PRISMA_LOG_QUERIES === "1"
        ? ["query", "error", "warn"]
        : ["error", "warn"]
      : ["error"],
});

export async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info("✅ Database connected successfully");
  } catch (error) {
    logger.error("❌ Database connection failed:", error);
    throw error;
  }
}

export async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    logger.info("Database disconnected");
  } catch (error) {
    logger.error("Error disconnecting database:", error);
  }
}

export default prisma;

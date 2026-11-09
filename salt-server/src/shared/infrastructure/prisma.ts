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

/** 기동 때 미리 여는 연결 수 — 화면 한 요청이 나란히 쓰는 쿼리 수(판단 상세 약 15) 근처 */
const WARM_CONNECTIONS = 16;

export async function connectDatabase() {
  try {
    await prisma.$connect();
    // 연결 풀을 미리 채운다 — 화면 요청 하나가 쿼리 15개를 나란히 날리는데(판단 상세) 첫 요청이 연결을 여는 값을 다 냈다
    // (재기동 직후 0.3~0.6초 → BFF 300ms 예산에서 504, 2026-11-09 `DB-REQ-017`). 연결 수만큼 가벼운 쿼리를 동시에 한 번
    await Promise.all(Array.from({ length: WARM_CONNECTIONS }, () => prisma.$queryRaw`SELECT 1`));
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

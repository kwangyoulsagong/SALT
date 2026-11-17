import { AsyncLocalStorage } from "node:async_hooks";

import { PrismaClient } from "@prisma/client";
import { logger } from "../config/logger";

// 쿼리 로그는 기본으로 끈다. 시세 갱신마다 전 쿼리가 찍혀 로그가 하루 수십 GB로 불어난다.
// 필요할 때만 PRISMA_LOG_QUERIES=1 로 켠다.
const log: Array<"query" | "error" | "warn"> =
  process.env.NODE_ENV === "development"
    ? process.env.PRISMA_LOG_QUERIES === "1"
      ? ["query", "error", "warn"]
      : ["error", "warn"]
    : ["error"];

/**
 * **연결 풀을 둘로 나눈다 — 화면 요청 · 배치(워커)**(2026-11-17). 한 풀(17)을 같이 쓰면 재기동 직후 · cron 이 몰리는 분에 워커 쿼리가
 * 풀을 차지해 화면 요청이 대기열 뒤에 섰다 — 서버 CPU 3% 인데 패널 15ms → 200~350ms, BFF 예산 400ms 를 넘어 504 가 연달아
 * (실측 16:23:35~:56 · 16:33:06~16:34:12). 워커는 배치 풀만 쓰니 아무리 몰려도 화면 풀은 비어 있다.
 * 합(14 + 6 = 20)은 전과 비슷하게 — DB `max_connections` 100 을 예측 · 뉴스 · BFF 와 나눈다
 */
export const HTTP_POOL_SIZE = 14;
export const BATCH_POOL_SIZE = 6;

const withPool = (url: string | undefined, size: number): string | undefined => {
  if (!url) return url;
  const u = new URL(url);
  u.searchParams.set("connection_limit", String(size));
  return u.toString();
};

const httpClient = new PrismaClient({ log, datasourceUrl: withPool(process.env.DATABASE_URL, HTTP_POOL_SIZE) });
const batchClient = new PrismaClient({ log, datasourceUrl: withPool(process.env.DATABASE_URL, BATCH_POOL_SIZE) });

/** 배치 맥락 — 이 안에서 시작한 비동기 일(타이머 · cron 회차 포함)은 전부 배치 풀을 쓴다 */
const batchContext = new AsyncLocalStorage<true>();

/** 워커 등록을 감싼다 — cron 타이머는 등록될 때의 맥락을 물려받아 회차마다 배치 풀로 간다(`app.ts` `startWorkers`) */
export const runAsBatch = <T>(fn: () => T): T => batchContext.run(true, fn);
export const inBatchContext = (): boolean => batchContext.getStore() === true;

/**
 * 맥락에 따라 고르는 클라이언트 — 저장소 코드는 바꾸지 않는다(`prisma.x.findMany` · `$queryRaw` · `$transaction` 그대로).
 * 부를 때마다 고르므로 같은 저장소가 화면에선 화면 풀, 워커에선 배치 풀을 쓴다. 함수는 고른 클라이언트에 묶어 돌려준다
 */
export const routedClient = <C extends object>(http: C, batch: C, isBatch: () => boolean): C =>
  new Proxy(http, {
    get(_target, prop) {
      const client = isBatch() ? batch : http;
      const value = Reflect.get(client, prop, client) as unknown;
      return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(client) : value;
    },
  });

const prisma = routedClient(httpClient, batchClient, inBatchContext);

/** 기동 때 미리 여는 화면 풀 연결 수 — 화면 한 요청이 나란히 쓰는 쿼리 수(판단 상세 약 15) 근처, 풀 크기 안 */
const WARM_CONNECTIONS = HTTP_POOL_SIZE;

export async function connectDatabase() {
  try {
    await Promise.all([httpClient.$connect(), batchClient.$connect()]);
    // 화면 풀을 미리 채운다 — 화면 요청 하나가 쿼리 15개를 나란히 날리는데(판단 상세) 첫 요청이 연결을 여는 값을 다 냈다
    // (재기동 직후 0.3~0.6초 → BFF 300ms 예산에서 504, 2026-11-09 `DB-REQ-017`). 연결 수만큼 가벼운 쿼리를 동시에 한 번
    await Promise.all(Array.from({ length: WARM_CONNECTIONS }, () => httpClient.$queryRaw`SELECT 1`));
    logger.info("✅ Database connected successfully");
  } catch (error) {
    logger.error("❌ Database connection failed:", error);
    throw error;
  }
}

export async function disconnectDatabase() {
  try {
    await Promise.all([httpClient.$disconnect(), batchClient.$disconnect()]);
    logger.info("Database disconnected");
  } catch (error) {
    logger.error("Error disconnecting database:", error);
  }
}

export default prisma;

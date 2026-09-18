import { contextUseCases } from "../composition";
import { logger } from "../shared/config/logger";
import { schedule } from "../shared/infrastructure/scheduler";

/**
 * `market` 컨텍스트의 주기 작업.
 *
 * ## 워커 넷이 한 파일이 됐다
 *
 * `market-sync` · `market-price-updater` · `price-history` · `technical-indicator` 는
 * 각자 클래스와 중복 실행 플래그(`running` / `isUpdating`)와 부팅 실행을 갖고 있었다.
 * **절차는 전부 `market/application` 의 유스케이스로 올라갔고**(FR-5) 여기 남은 것은
 * 스케줄과 이름뿐이다. 락은 `shared/infrastructure/scheduler` 하나가 갖는다.
 *
 * > **부팅 시 `market-sync` 가 두 번 돌고 있었다.** `market-sync.worker.ts` 가 모듈
 * > 최상위에서 `worker.sync()` 를 부르고, `app.ts` 가 import 후 다시 불렀다. import 가
 * > 작업을 시작시키는 구조라 그 사실이 호출 지점에서 보이지 않았다. 등록이 한 곳으로
 * > 오면서 사라졌다.
 */

interface MarketJob {
  name: string;
  /** cron 식. 초 필드를 쓰지 않는다. */
  expression: string;
  /** 부팅 직후 1회 돌릴지. 원문 워커가 전부 그렇게 했다. */
  runAtBoot: boolean;
  run: () => Promise<unknown>;
}

const jobs = (): MarketJob[] => {
  const market = contextUseCases.market;

  return [
    {
      name: "market-sync",
      expression: "0 */6 * * *",
      runAtBoot: true,
      run: () => market.syncMarketListings.execute(),
    },
    {
      name: "market-price-update",
      expression: "* * * * *",
      runAtBoot: true,
      run: () => market.updateAllMarketPrices.execute(),
    },
    {
      name: "price-history-collect",
      expression: "*/5 * * * *",
      runAtBoot: true,
      run: () => market.collectPriceHistory.execute(),
    },
    {
      name: "technical-indicators",
      expression: "*/2 * * * *",
      runAtBoot: true,
      run: () => market.refreshTechnicalIndicators.execute(),
    },
  ];
};

/**
 * 부팅 실행은 **기다리지 않는다.** 네 작업이 전부 거래소를 왕복하고, 그중 하나라도
 * 던지면 서버 기동이 멈춘다 — 시세가 늦는 것과 서버가 안 뜨는 것은 다른 문제다.
 */
const runAtBoot = (job: MarketJob) => {
  job.run().catch((error) => {
    logger.error(`부팅 실행 실패: ${job.name}`, error);
  });
};

export const startMarketWorkers = () => {
  for (const job of jobs()) {
    schedule(job.name, job.expression, () => job.run().then(() => undefined));
    if (job.runAtBoot) runAtBoot(job);
  }

  logger.info("📈 Market workers scheduled");
};

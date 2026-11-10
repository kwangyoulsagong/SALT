import { contextUseCases } from "../composition";
import { logger } from "../shared/config/logger";
import { runGuarded, schedule } from "../shared/infrastructure/scheduler";
import { onWake } from "../shared/infrastructure/wake";

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
  /** 놓친 회차를 깬 자리에서 한 번(`scheduler.ts` 머리) — 하루 한 번 작업만 */
  catchUp?: boolean;
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
      // `market_assets` 의 유일한 정기 쓰기다. BFF `price-updater.worker` 는 관심 목록 · 보유 가격만 쓴다 —
      // 둘은 중복이 아니다. 지우면 코치 판정 가격 신선도(`inputFreshness` · `preflight`)가 막힌다(SRV-REQ-007 FR-2 정정, 2026-10-30)
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
      // 5분봉 따라잡기(SRV-REQ-057 FR-2) — 정기 수집 창 밖으로 밀린 종목만. 정기 회차와 2분 어긋나게(같은 거래소 한도)
      name: "price-history-catchup",
      expression: "2-59/5 * * * *",
      runAtBoot: false,
      run: () => market.catchUpPriceHistory.execute(),
    },
    {
      // 추적 목록 일별 스냅샷(SRV-REQ-057 FR-7) — 하루 한 번 · 멱등이라 부팅에도(그날 행이 없으면 쓴다)
      name: "universe-snapshot",
      expression: "10 0 * * *",
      runAtBoot: true,
      catchUp: true,
      run: () => market.captureUniverseSnapshot.execute(),
    },
    {
      // 대형 체결 — 거래대금 상위 50 + 관심 종목, 마지막 저장 체결 뒤부터(F010 슬라이스 1)
      name: "whale-trades-collect",
      expression: "*/5 * * * *",
      runAtBoot: true,
      run: () => market.collectWhaleTrades.execute(),
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
    schedule(job.name, job.expression, () => job.run().then(() => undefined), { catchUp: job.catchUp });
    if (job.runAtBoot) runAtBoot(job);
  }

  // 깸(SRV-REQ-057 FR-6) — 코인 5분봉 따라잡기 · 그날 스냅샷. 같은 이름 = cron 과 같은 락
  const market = contextUseCases.market;
  onWake("price-history-catchup", () => runGuarded("price-history-catchup", () => market.catchUpPriceHistory.execute()));
  onWake("universe-snapshot", () => runGuarded("universe-snapshot", () => market.captureUniverseSnapshot.execute()));

  logger.info("📈 Market workers scheduled");
};

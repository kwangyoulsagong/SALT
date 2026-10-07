import { contextUseCases } from "../composition";
import { logger } from "../shared/config/logger";
import { schedule } from "../shared/infrastructure/scheduler";

/**
 * 국내 주식 주기 작업(F011 슬라이스 0 · `SRV-REQ-040`). 스케줄과 순서만 갖고 절차는 `market/application`.
 *
 * **KIS 키가 없으면 아무것도 등록하지 않는다**(FR-6). 코인 워커(`market.worker.ts`)와 파일을 나눈 이유:
 * KIS 장애 · 미설정이 코인 시세를 막지 않게 등록부터 격리한다.
 *
 * 시각은 전부 KST(`Asia/Seoul`) — 장 시간에 묶인 작업이라 서버 시간대를 따르면 배포 환경에서 틀린다.
 *
 * | 작업 | 언제 | 왜 |
 * |---|---|---|
 * | `kr-master-sync` | 매일 07:30 | 마스터는 영업일 장전 갱신(근거 [약]) |
 * | `kr-calendar-sync` | 평일 09:10 | KIS 휴장일 조회(권고 1일 1회) — 거부되면 일봉 역산 + 오늘 개장 관측 |
 * | `kr-daily-candles` | 평일 15:45 | 정규장 15:30 마감 + 정정 여유 |
 * | `kr-quote-poll` | 매분 | 부를지는 유스케이스가 장 상태로 정한다(정규장 매분 · 장전/시간외 5분) |
 * | `kr-realtime` | 매분 | 08:30~18:00 개장일이면 WS 를 붙이고 슬롯을 맞춘다 · 밖이면 끊는다(슬라이스 1) |
 */
const TZ = "Asia/Seoul";

export const startKrStockWorkers = () => {
  const kr = contextUseCases.market.krStock;
  if (!kr) {
    logger.info("🇰🇷 국내 주식 꺼짐 — KIS_APP_KEY 없음");
    return;
  }

  const jobs: Array<{ name: string; expression: string; run: () => Promise<unknown> }> = [
    { name: "kr-master-sync", expression: "30 7 * * *", run: () => kr.syncMaster.execute() },
    { name: "kr-calendar-sync", expression: "10 9 * * 1-5", run: () => kr.syncCalendar.execute() },
    { name: "kr-daily-candles", expression: "45 15 * * 1-5", run: () => kr.syncDailyCandles.execute() },
    { name: "kr-quote-poll", expression: "* * * * *", run: () => kr.pollQuotes.execute() },
    { name: "kr-realtime", expression: "* * * * *", run: () => kr.realtime.reconcile() },
  ];
  for (const job of jobs) schedule(job.name, job.expression, () => job.run().then(() => undefined), { timezone: TZ });

  /**
   * 부팅 실행은 **순서가 있다** — 마스터가 있어야 유니버스(시총 상위)가 서고, 달력이 있어야 장 상태가
   * 맞는다. 각 단계 실패는 다음 단계를 막지 않는다(이전 마스터 · 추정 달력으로 진행). 서버 기동은 기다리지 않는다
   */
  void (async () => {
    // 달력은 일봉 뒤에 한 번 더 — 처음 기동이면 역산할 일봉이 일봉 백필 뒤에야 생긴다
    const boot = [
      () => kr.syncMaster.execute(),
      () => kr.syncCalendar.execute(),
      () => kr.pollQuotes.execute(),
      // 실시간은 현재가 행이 생긴 뒤(체결은 기존 행만 갱신한다)
      () => kr.realtime.reconcile(),
      () => kr.syncDailyCandles.execute(),
      () => kr.syncCalendar.execute(),
    ];
    for (const job of boot) {
      try {
        await job();
      } catch (error) {
        logger.error(`국내 주식 부팅 실행 실패 — ${(error as Error).message}`);
      }
    }
  })();

  logger.info(`🇰🇷 국내 주식 워커 등록 (${jobs.length})`);
};

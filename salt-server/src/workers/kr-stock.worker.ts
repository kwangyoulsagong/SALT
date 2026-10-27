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
 * | `kr-full-daily-candles` | 평일 18:00 · 주말 08:00 → 다음 07:20 KST 멈춤 | 상장 보통주 전 종목 일봉 5년(FR-40) — 모의 키 약 2건/s 라 밤에만. 회차가 겹치면 건너뛴다 |
 * | `kr-minute-bars` | 평일 15:40 · 20:40 | 오늘 5분봉을 KIS 분봉으로 덮어씀 + 지난 30일 빈 날 백필(회차 1,200 호출 상한) |
 * | `kr-quote-poll` | 매분 | 부를지는 유스케이스가 장 상태로 정한다(정규장 매분 · 장전/시간외 5분). 뒤이어 국내 주식 보유 평가 |
 * | `kr-provider-metrics` | 10분 | TR 별 호출 · 실패 · 초과 · 오늘 토큰 발급 수(FR-94) |
 * | `kr-realtime` | 매분 | 08:30~16:00 개장일이면 WS 를 붙이고 슬롯을 맞춘다 · 밖이면 끊는다(시간외 단일가는 REST 10분 — 아래) |
 * | `kr-quote-poll` 뒤 지수 | 매분 | 코스피 · 코스닥(FR-49) — 현재가와 같은 박자 · 부를지는 유스케이스가 정한다 |
 * | `kr-quote-poll` 뒤 시간외 | 16:11 … 18:01 10분마다 | 시간외 단일가(FR-27) — 체결 1분 뒤 유니버스만, 정규장 칸과 따로 |
 * | `kr-investor-flows` | 평일 18:40 · 21:40 | 투자자 순매수 30거래일(FR-50) — 당일 값이 18:00 뒤라 그 뒤 · 전 종목 일봉(18:00) 앞쪽이 대개 끝난 뒤. 한도 초과면 회차를 접고 21:40 이 남은 종목을 이어 받는다(FR-91) |
 *
 * 매분 작업이 아닌 것은 `catchUp` — 놓친 회차(맥 수면)를 깨어난 자리에서 한 번 돈다. 2026-10-26 18:40 투자자 회차가 그렇게 사라졌다(6b).
 */
const TZ = "Asia/Seoul";

export const startKrStockWorkers = () => {
  const kr = contextUseCases.market.krStock;
  const portfolio = contextUseCases.portfolio;
  if (!kr) {
    logger.info("🇰🇷 국내 주식 꺼짐 — KIS_APP_KEY 없음");
    return;
  }

  /** `catchUp` — 하루 몇 번 도는 작업은 맥 수면 등으로 놓친 회차를 깨어난 자리에서 한 번 돈다(`scheduler.ts` 머리 주석) */
  const jobs: Array<{ name: string; expression: string; run: () => Promise<unknown>; catchUp?: boolean }> = [
    { name: "kr-master-sync", expression: "30 7 * * *", run: () => kr.syncMaster.execute(), catchUp: true },
    // 로고 판정 — 마스터 뒤. 판정할 종목(새 종목 · 30일 지난 것)만 본다
    { name: "kr-logo-resolve", expression: "50 7 * * *", run: () => kr.resolveLogos.execute(), catchUp: true },
    { name: "kr-calendar-sync", expression: "10 9 * * 1-5", run: () => kr.syncCalendar.execute(), catchUp: true },
    { name: "kr-daily-candles", expression: "45 15 * * 1-5", run: () => kr.syncDailyCandles.execute(), catchUp: true },
    // 전 종목 일봉 — 시세 창(08:30~16:00)과 겹치지 않는 밤 · 주말. 부팅 실행은 하지 않는다(낮에 기동해도 한도를 안 태운다).
    // 같은 이유로 catchUp 도 없다 — 멈춤이 "다음 07:20" 이라 낮에 따라 돌면 장중 내내 돈다. 놓친 밤은 다음 밤이 할 일로 잇는다
    { name: "kr-full-daily-candles", expression: "0 18 * * 1-5", run: () => kr.syncFullDailyCandles.execute() },
    { name: "kr-full-daily-candles-weekend", expression: "0 8 * * 0,6", run: () => kr.syncFullDailyCandles.execute() },
    // 장 마감 보정 · 30일 백필 — 호출 상한에 걸리면 다음 회차(밤 · 다음 날)가 잇는다
    { name: "kr-minute-bars", expression: "40 15,20 * * 1-5", run: () => kr.syncMinuteBars.execute(), catchUp: true },
    // 보유 평가는 시세 회차 바로 뒤 — 같은 분에 같은 값을 본다(F011 슬라이스 3b)
    {
      name: "kr-quote-poll",
      expression: "* * * * *",
      run: async () => {
        await kr.pollQuotes.execute();
        await portfolio.revalueKrStockHoldings.execute();
        // 부가 정보는 맨 뒤 — 지수가 실패해도 보유 평가는 이미 끝났다(FR-91)
        await kr.pollIndices.execute();
        // 시간외 단일가 — 16:11 … 18:01 10분마다만(유스케이스가 정한다). 그 시간엔 현재가 회차가 쉰다
        await kr.pollAfterHours.execute();
      },
    },
    // 21:40 은 이어 받기 — 18:40 이 한도에 양보했거나 놓쳤으면 남은 종목만, 다 받았으면 호출 0(6b)
    { name: "kr-investor-flows", expression: "40 18,21 * * 1-5", run: () => kr.syncInvestorFlows.execute(), catchUp: true },
    { name: "kr-realtime", expression: "* * * * *", run: () => kr.realtime.reconcile() },
    // 관측 지표(FR-94) — 로그가 지표다
    { name: "kr-provider-metrics", expression: "*/10 * * * *", run: async () => kr.reportMetrics.execute() },
  ];
  for (const job of jobs) {
    schedule(job.name, job.expression, () => job.run().then(() => undefined), { timezone: TZ, catchUp: job.catchUp });
  }

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
      // 밤에 기동해도 보유 평가가 마지막 저장값으로 선다(폴링은 장 시간에만 시세를 받는다)
      () => portfolio.revalueKrStockHoldings.execute(),
      // 지수 — 기동 뒤 한 번은 받는다(빈 요약 띠로 시작하지 않게)
      () => kr.pollIndices.execute(),
      // 실시간은 현재가 행이 생긴 뒤(체결은 기존 행만 갱신한다)
      () => kr.realtime.reconcile(),
      () => kr.syncDailyCandles.execute(),
      () => kr.syncCalendar.execute(),
      // 로고는 맨 뒤 — 화면은 판정 전에도 티커 로고를 쓴다
      () => kr.resolveLogos.execute(),
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

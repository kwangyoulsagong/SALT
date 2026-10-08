import { logger } from "../../shared/config/logger";
import { mapConcurrent } from "../../shared/lib";
import {
  KR_FIVE_MINUTE_BUCKETS_PER_DAY,
  KR_TOKEN_ISSUE_WARN_PER_DAY,
  addKstDays,
  krMinutesToFiveMinute,
  isKrQuoteWindow,
  krMarketSession,
  kstDateOf,
  type KrHeldCodesSource,
  type KrMarketCalendarStore,
  type KrProviderHealthPort,
  type KrSessionView,
  type KrStockMasterSource,
  type KrStockQuoteFact,
  type KrStockQuotePort,
  type KrStockStore,
} from "../domain";

/**
 * 국내 주식 수집(F011 슬라이스 0 · `SRV-REQ-040`). 워커가 부르고, 같은 유스케이스를 스크립트가 부른다.
 *
 * KIS 호출은 전부 `KisClient` 의 페이서 하나를 지나간다 — 출발 간격은 거기서 지킨다. 여기서는 응답을
 * 기다리는 동안 다음 요청이 출발하게 **동시 `KIS_CONCURRENCY` 개**로 겹쳐 부른다. 하나씩 기다리면
 * 응답 지연(약 0.75s) × 종목 수가 걸린다 — 현재가 50종목 순차 38s(2026-10-07 실측).
 * 저장은 회차당 배치 한 번이다.
 */
const KIS_CONCURRENCY = 6;

/** 장 상태 계산에 쓰는 달력 창 — 앞뒤 연휴(최장 10일 안팎)를 넉넉히 덮는다 */
const CALENDAR_WINDOW_DAYS = 20;

export const loadKrSession = async (calendar: KrMarketCalendarStore, now: Date): Promise<KrSessionView> => {
  const today = kstDateOf(now);
  const days = await calendar.days(addKstDays(today, -CALENDAR_WINDOW_DAYS), addKstDays(today, CALENDAR_WINDOW_DAYS));
  return krMarketSession(now, new Map(days.map((d) => [d.date, d.isOpen])));
};

/** 유니버스 = 보유(누구든) ∪ 관심(누구든) ∪ 시총 상위 N(FR-11). 보유는 거래 입력이 `kr_stock` 을 받으면서 더했다(슬라이스 3b) */
export class ResolveKrStockUniverse {
  constructor(
    private readonly store: KrStockStore,
    private readonly held: KrHeldCodesSource,
    private readonly topN: number
  ) {}

  async execute(): Promise<string[]> {
    const [held, watched, top] = await Promise.all([
      this.held.heldCodes(),
      this.store.watchedCodes(),
      this.store.topByMarketCap(this.topN),
    ]);
    // 보유 → 관심 → 시총 — 실시간 슬롯 배정(FR-12)과 한도에 걸려 회차가 잘릴 때(FR-91) 이 순서로 먼저 받는다
    return [...new Set([...held, ...watched, ...top])];
  }
}

/** 종목 마스터(FR-10) — 매일 07:30 KST. 실패하면 이전 마스터를 그대로 둔다 */
export class SyncKrStockMaster {
  constructor(
    private readonly source: KrStockMasterSource,
    private readonly store: KrStockStore,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute() {
    const listings = await this.source.listings();
    const at = this.now();
    await this.store.upsertListings(listings, at);
    const delisted = await this.store.markDelistedExcept(
      listings.map((l) => l.code),
      at
    );
    logger.info(`🇰🇷 국내 주식 마스터: ${listings.length}종목 · 상폐 표시 ${delisted}`);
    return { listings: listings.length, delisted };
  }
}

/** 역산 창 — 일봉 백필 2년 전부. 한 문장 집계라 길이가 비용을 크게 바꾸지 않는다 */
const DERIVE_DAYS = 730;
/** 오늘 개장 관측 기준 종목(시총 1위) · 시각 — 09:00 개장 뒤 첫 체결이 봉에 잡힐 여유 */
const PROBE_CODE = "005930";
const PROBE_AFTER_MINUTES = 9 * 60 + 10;

/**
 * 개장일 달력(FR-14). 매 평일 09:10 KST · 부팅.
 *
 * 1. KIS 휴장일 조회 — 앞으로의 휴장까지 알 수 있는 유일한 출처. **이 앱 키로는 거부된다**(2026-10-07
 *    `EGW02004`) — 실패하면 2 · 3 으로 지난날과 오늘을 채운다. 키 권한이 풀리면 1 이 그대로 이긴다
 * 2. 저장된 일봉으로 지난 개장일 역산 — 실제 체결 기록이라 지난날은 정확하다
 * 3. 오늘 09:10 이후면 시총 1위 종목의 당일 봉 유무로 오늘 개장을 확정한다(호출 1건)
 *
 * 미래 휴장은 1 이 없으면 모른다 — 장 상태가 `calendarKnown = false` 로 그 추정을 드러낸다.
 */
export class SyncKrMarketCalendar {
  constructor(
    private readonly kis: KrStockQuotePort,
    private readonly calendar: KrMarketCalendarStore,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute() {
    const at = this.now();
    const today = kstDateOf(at);

    try {
      const days = await this.kis.marketDays(today);
      await this.calendar.upsertDays(days, at, "kis");
      logger.info(`🗓️ KRX 달력(KIS): ${days.length}일 ${days[0]?.date ?? ""}~${days.at(-1)?.date ?? ""}`);
      return { source: "kis" as const, days: days.length };
    } catch (error) {
      logger.warn(`KRX 휴장일 조회 실패 — 일봉 역산으로 대신한다: ${(error as Error).message}`);
    }

    const derived = await this.calendar.daysFromDailyCandles(addKstDays(today, -DERIVE_DAYS), addKstDays(today, -1));
    await this.calendar.upsertDays(derived, at, "candles");

    const kstMinutes = Math.floor(((at.getTime() + 9 * 3_600_000) % 86_400_000) / 60_000);
    const weekday = ![0, 6].includes(new Date(`${today}T00:00:00Z`).getUTCDay());
    let todayOpen: boolean | null = null;
    if (weekday && kstMinutes >= PROBE_AFTER_MINUTES) {
      const bars = await this.kis.dailyCandles(PROBE_CODE, today, today);
      todayOpen = bars.length > 0;
      await this.calendar.upsertDays(
        [{ date: today, isOpen: todayOpen, isTradingDay: todayOpen, isBusinessDay: todayOpen, isSettlementDay: todayOpen }],
        at,
        "probe"
      );
    }

    const closed = derived.filter((d) => !d.isOpen).length;
    logger.info(`🗓️ KRX 달력(역산): ${derived.length}일 · 휴장 ${closed} · 오늘 ${todayOpen ?? "미확인"}`);
    return { source: "candles" as const, days: derived.length, closed, todayOpen };
  }
}

/** 일봉 2년(약 490 거래일, FR-20). 정기 보관 정책(`price_history` 1d 2년)과 같은 길이 */
const BACKFILL_DAYS = 730;
/** 한 호출 최대 100건 — 달력 140일이면 거래일 100일을 넘지 않는다 */
const PAGE_CALENDAR_DAYS = 140;

/**
 * 일봉 백필 · 확정(FR-20). 부팅과 매 거래일 15:45 KST 에 돈다.
 *
 * 종목마다 **마지막 저장 일봉의 날짜부터** 오늘까지 다시 받는다 — 장중에 받은 그날 봉(미확정)을 장 마감
 * 뒤 실행이 덮어쓴다. 처음 보는 종목은 2년 전부터. 저장은 유니크 키 위의 upsert 라 재실행이 행을
 * 늘리지 않는다. 한 종목의 실패가 회차를 멈추지 않는다.
 */
export class SyncKrDailyCandles {
  constructor(
    private readonly kis: KrStockQuotePort,
    private readonly store: KrStockStore,
    private readonly universe: ResolveKrStockUniverse,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute() {
    const today = kstDateOf(this.now());
    const codes = await this.universe.execute();
    const latest = await this.store.latestDailyCandleAt(codes);

    let requests = 0;
    let candles = 0;
    let failed = 0;

    await mapConcurrent(codes, KIS_CONCURRENCY, async (code) => {
      const last = latest.get(code);
      let from = last ? kstDateOf(last) : addKstDays(today, -BACKFILL_DAYS);
      try {
        while (from <= today) {
          const to = [addKstDays(from, PAGE_CALENDAR_DAYS - 1), today].sort()[0];
          const page = await this.kis.dailyCandles(code, from, to);
          requests++;
          await this.store.upsertDailyCandles(code, page);
          candles += page.length;
          from = addKstDays(to, 1);
        }
      } catch (error) {
        failed++;
        logger.warn(`국내 주식 일봉 실패 — ${code}: ${(error as Error).message}`);
      }
    });

    logger.info(`🕯️ 국내 주식 일봉: 종목 ${codes.length} · 요청 ${requests} · 봉 ${candles} · 실패 ${failed}`);
    return { codes: codes.length, requests, candles, failed };
  }
}

/** 연속 실패가 이만큼이면 이번 회차를 멈춘다(FR-90 서킷) — 장애에 한도만 태우지 않는다 */
const CIRCUIT_FAILURES = 5;
/** 장전 · 시간외는 5분 간격(F011 §Worker) */
const OFF_REGULAR_EVERY_MINUTES = 5;

/**
 * 현재가 1분 폴링(FR-23). 워커는 매분 부르고, **부를지 말지는 여기서** 장 상태로 정한다.
 *
 * - 정규장(09:00~15:30) — 매분
 * - 장전 · 장후 시간외 종가(08:30~09:00 · 15:30~16:00) — 5분마다
 * - 그 밖 — 건너뛴다. 단 **프로세스가 뜬 뒤 한 번은** 받는다(빈 표로 시작하지 않게, 마감 값 확정)
 *
 * 받은 값을 회차 끝에 한 번에 쓴다. 실패한 종목은 이전 값이 남는다 — 빈 값으로 덮지 않는다(FR-90).
 */
export class PollKrStockQuotes {
  private polledOnce = false;

  constructor(
    private readonly kis: KrStockQuotePort,
    private readonly store: KrStockStore,
    private readonly calendar: KrMarketCalendarStore,
    private readonly universe: ResolveKrStockUniverse,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute() {
    const at = this.now();
    const session = await loadKrSession(this.calendar, at);
    const minute = Math.floor(at.getTime() / 60_000);
    const regular = session.session === "regular" || session.session === "closing_auction";
    const due = regular || (isKrQuoteWindow(session) && minute % OFF_REGULAR_EVERY_MINUTES === 0);

    // 기동 직후 한 번은 받되, 시간외 단일가 중이면 받지 않는다 — 그 시간 현재가는 시간외 값이다(isKrQuoteWindow)
    const bootFill = !this.polledOnce && session.session !== "after_hours_single";
    if (!due && !bootFill) return { skipped: true as const, session: session.session };
    this.polledOnce = true;

    // 실시간 값이 90초 안에 들어온 종목은 체결이 이미 현재가를 준다 — 상하한 · PER 같은 나머지 칸만 5분마다 채운다
    const fullRefresh = minute % OFF_REGULAR_EVERY_MINUTES === 0;
    const realtime = fullRefresh ? new Set<string>() : new Set(await this.store.realtimeFreshCodes(new Date(at.getTime() - 90_000)));
    const codes = (await this.universe.execute()).filter((code) => !realtime.has(code));
    const facts: KrStockQuoteFact[] = [];
    let consecutive = 0;
    let failed = 0;
    let tripped = false;

    await mapConcurrent(codes, KIS_CONCURRENCY, async (code) => {
      // 서킷이 열리면 남은 종목은 부르지 않는다(FR-90) — 장애에 한도만 태우지 않는다
      if (tripped) return;
      try {
        facts.push(await this.kis.quote(code));
        consecutive = 0;
      } catch (error) {
        failed++;
        consecutive++;
        logger.warn(`국내 주식 현재가 실패 — ${code}: ${(error as Error).message}`);
        if (consecutive >= CIRCUIT_FAILURES && !tripped) {
          tripped = true;
          logger.warn(`국내 주식 현재가 — 연속 실패 ${consecutive}회, 이번 회차 중단`);
        }
      }
    });

    await this.store.upsertQuotes(facts, "poll_1m", this.now());
    return { skipped: false as const, session: session.session, codes: codes.length, updated: facts.length, failed };
  }
}

/**
 * KIS 관측 지표(FR-94) — 10분마다 TR 별 호출 · 실패 · 초과 수를 한 줄로 남긴다. 토큰 발급이 하루 3회를 넘으면 경고
 * (재시작이 발급을 늘리면 DB 캐시가 깨진 것이다). 지표 저장소가 없어 로그가 지표다
 */
export class ReportKrProviderMetrics {
  constructor(private readonly health: KrProviderHealthPort) {}

  execute() {
    const { byTr, tokensIssuedToday } = this.health.drainMetrics();
    const snapshot = this.health.snapshot();
    const parts = Object.entries(byTr).map(([tr, m]) => `${tr} ${m.calls}/${m.failures}/${m.rateLimited}`);
    logger.info(
      `📊 KIS 10분(호출/실패/초과): ${parts.join(" · ") || "호출 없음"} · 상태 ${snapshot.status} · 연속 실패 ${snapshot.consecutiveFailures} · 오늘 토큰 ${tokensIssuedToday}`
    );
    if (tokensIssuedToday > KR_TOKEN_ISSUE_WARN_PER_DAY) {
      logger.warn(`KIS 접근 토큰이 오늘 ${tokensIssuedToday}회 발급됐다 — DB 캐시를 확인한다`);
    }
    return { byTr, tokensIssuedToday, status: snapshot.status };
  }
}

/**
 * 5분봉 보관 — 코인과 같은 30일. 정리 작업(`CollectPriceHistory.purgeOlderThan`)이 자산군 구분 없이 5분봉 30일을 지운다.
 * 기획의 "1년 백필"은 보관 정책과 어긋나 30일로 맞췄다(기획 정정 — 코인과 같은 기능)
 */
const MINUTE_BACKFILL_DAYS = 30;
/** 한 회차 KIS 호출 상한 — 실측 처리량 약 2건/s 에서 10분 남짓. 남은 날은 다음 회차가 잇는다 */
const MINUTE_CALLS_PER_RUN = 1_200;
/** 하루 1분봉 390개 = 120 × 4 페이지 */
const MINUTE_PAGES_PER_DAY = 4;
/** 이만큼 있고 종가 봉(15:25)이 있으면 그날은 채워진 것으로 본다 — 체결 없는 5분이 드물게 있다 */
const MINUTE_DAY_COMPLETE = KR_FIVE_MINUTE_BUCKETS_PER_DAY - 8;

/**
 * 5분봉 장 마감 보정 · 백필(FR-21). 평일 15:40 KST.
 *
 * - **오늘**(개장일 · 15:35 뒤): 실시간 집계를 KIS 1분봉에서 만든 5분봉으로 덮어쓴다 — 재시작 · 끊김으로 빈 버킷과
 *   슬롯 밖 종목(실시간 집계가 없다)을 채운다
 * - **지난 30일**: 종가 봉이 없거나 봉이 모자란 날만, 최신 날부터. 회차 호출 상한을 넘으면 다음 회차가 잇는다
 */
export class SyncKrMinuteBars {
  constructor(
    private readonly kis: KrStockQuotePort,
    private readonly store: KrStockStore,
    private readonly calendar: KrMarketCalendarStore,
    private readonly universe: ResolveKrStockUniverse,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute() {
    const at = this.now();
    const today = kstDateOf(at);
    const kstMinutes = Math.floor(((at.getTime() + 9 * 3_600_000) % 86_400_000) / 60_000);
    const from = addKstDays(today, -MINUTE_BACKFILL_DAYS);
    const openDays = (await this.calendar.days(from, today))
      .filter((d) => d.isOpen && (d.date < today || kstMinutes >= 15 * 60 + 35))
      .map((d) => d.date)
      .sort()
      .reverse();
    const codes = await this.universe.execute();
    const coverage = await this.store.minuteBarCoverage(codes, from);

    const work: Array<{ code: string; date: string }> = [];
    for (const date of openDays) {
      for (const code of codes) {
        const c = coverage.get(code)?.get(date);
        if (date === today || !c || !c.hasClose || c.count < MINUTE_DAY_COMPLETE) work.push({ code, date });
      }
    }

    let calls = 0;
    let days = 0;
    let bars = 0;
    let failed = 0;
    const budget = Math.floor(MINUTE_CALLS_PER_RUN / MINUTE_PAGES_PER_DAY);
    await mapConcurrent(work.slice(0, budget), KIS_CONCURRENCY, async ({ code, date }) => {
      try {
        const minutes = [];
        let cursor = "153100";
        for (let page = 0; page < MINUTE_PAGES_PER_DAY; page++) {
          const batch = await this.kis.dayMinuteCandles(code, date, cursor);
          calls++;
          if (batch.length === 0) break;
          minutes.push(...batch);
          const earliest = batch.reduce((a, b) => (a.timestamp < b.timestamp ? a : b)).timestamp;
          const kst = new Date(earliest.getTime() + 9 * 3_600_000 - 60_000);
          if (kst.getUTCHours() < 9) break;
          cursor = kst.toISOString().slice(11, 19).replaceAll(":", "");
        }
        const fiveMinute = krMinutesToFiveMinute(minutes);
        await this.store.replaceMinuteCandles(code, fiveMinute);
        bars += fiveMinute.length;
        days++;
      } catch (error) {
        failed++;
        logger.warn(`국내 주식 5분봉 보정 실패 — ${code} ${date}: ${(error as Error).message}`);
      }
    });

    const remaining = Math.max(0, work.length - budget);
    logger.info(`🧱 국내 주식 5분봉 보정: 종목·일 ${days} · 호출 ${calls} · 봉 ${bars} · 실패 ${failed} · 남은 ${remaining}`);
    return { days, calls, bars, failed, remaining };
  }
}

import { logger } from "../../shared/config/logger";
import { mapConcurrent } from "../../shared/lib";
import {
  KR_FIVE_MINUTE_BUCKETS_PER_DAY,
  KR_TOKEN_ISSUE_WARN_PER_DAY,
  addKstDays,
  findDailyRewrite,
  krMinutesToFiveMinute,
  isKrQuoteWindow,
  kstAt,
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
  type Candle,
  type KrDailyRewrite,
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
 * 저장된 마지막 날 앞으로 겹쳐 받는 달력일(FR-42) — 마지막 날은 장중에 받은 미확정 봉일 수 있어 비교에서 빼므로,
 * 그 앞 확정 봉이 몇 개는 겹쳐야 수정주가 재작성이 보인다. 페이지(140일) 안이라 호출 수는 그대로다
 */
const REWRITE_OVERLAP_DAYS = 14;

/** from~to 를 140일 페이지로 앞으로 받아 모은다 — 저장은 부른 쪽이 한 번에 */
const fetchDailyRange = async (kis: KrStockQuotePort, code: string, from: string, to: string) => {
  const candles: Candle[] = [];
  let requests = 0;
  while (from <= to) {
    const end = [addKstDays(from, PAGE_CALENDAR_DAYS - 1), to].sort()[0];
    candles.push(...(await kis.dailyCandles(code, from, end)));
    requests++;
    from = addKstDays(end, 1);
  }
  return { candles, requests };
};

/**
 * 받은 봉이 저장본과 어긋나면(`findDailyRewrite`) **그 종목 이력을 통째로 다시 받아 바꾼다**(FR-42 · `FC-REQ-020` FR-10).
 * KIS 수정주가는 분할 · 병합 · 증자 · 감자 뒤 과거 쪽 전체가 새 기준으로 바뀌는데, 마지막 날부터만 이어 받으면 옛 기준
 * 과거와 새 기준 최근이 섞여 가짜 급등락(예: 1:5 병합이 +400%)이 남는다. 다 받은 뒤 한 문장으로 바꾸므로 중간에
 * 실패하면 옛 이력이 그대로 남고 다음 회차가 다시 판정한다.
 */
const applyDailyPage = async (
  kis: KrStockQuotePort,
  store: KrStockStore,
  code: string,
  fresh: Candle[],
  stored: ReadonlyArray<{ timestamp: Date; close: number }>,
  range: { earliest: Date; latest: Date },
  today: string
): Promise<{ requests: number; candles: number; rewrite: KrDailyRewrite | null }> => {
  const rewrite = findDailyRewrite(stored, fresh, range.latest);
  if (!rewrite) {
    await store.upsertDailyCandles(code, fresh);
    return { requests: 0, candles: fresh.length, rewrite: null };
  }
  const full = await fetchDailyRange(kis, code, kstDateOf(range.earliest), today);
  await store.replaceDailyCandles(code, full.candles);
  logger.warn(
    `국내 주식 일봉 수정주가 재작성 — ${code}: ${kstDateOf(rewrite.timestamp)} 저장 ${rewrite.stored} → 지금 ${rewrite.fresh}, 이력 ${full.candles.length}봉 다시 받음`
  );
  return { requests: full.requests, candles: full.candles.length, rewrite };
};

/**
 * 일봉 백필 · 확정(FR-20). 부팅과 매 거래일 15:45 KST 에 돈다.
 *
 * 종목마다 **마지막 저장 일봉 날짜 앞 `REWRITE_OVERLAP_DAYS` 일부터** 오늘까지 다시 받는다 — 장중에 받은 그날 봉(미확정)을
 * 장 마감 뒤 실행이 덮어쓰고, 겹친 확정 봉으로 수정주가 재작성을 판정한다(FR-42). 처음 보는 종목은 2년 전부터. 저장은
 * 유니크 키 위의 upsert 라 재실행이 행을 늘리지 않는다. 한 종목의 실패가 회차를 멈추지 않는다.
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
    const [range, stored] = await Promise.all([
      this.store.dailyCandleRange(codes),
      this.store.edgeDailyCloses(codes, "latest", REWRITE_OVERLAP_DAYS),
    ]);

    let requests = 0;
    let candles = 0;
    let failed = 0;
    let rewritten = 0;

    await mapConcurrent(codes, KIS_CONCURRENCY, async (code) => {
      const r = range.get(code);
      try {
        if (!r) {
          const page = await fetchDailyRange(this.kis, code, addKstDays(today, -BACKFILL_DAYS), today);
          requests += page.requests;
          await this.store.upsertDailyCandles(code, page.candles);
          candles += page.candles.length;
          return;
        }
        const page = await fetchDailyRange(this.kis, code, addKstDays(kstDateOf(r.latest), -REWRITE_OVERLAP_DAYS), today);
        const applied = await applyDailyPage(this.kis, this.store, code, page.candles, stored.get(code) ?? [], r, today);
        requests += page.requests + applied.requests;
        candles += applied.candles;
        if (applied.rewrite) rewritten++;
      } catch (error) {
        failed++;
        logger.warn(`국내 주식 일봉 실패 — ${code}: ${(error as Error).message}`);
      }
    });

    logger.info(
      `🕯️ 국내 주식 일봉: 종목 ${codes.length} · 요청 ${requests} · 봉 ${candles} · 재작성 ${rewritten} · 실패 ${failed}`
    );
    return { codes: codes.length, requests, candles, rewritten, failed };
  }
}

/** 전 종목 일봉 하한 — 5년(사용자 결정 2026-10-09). 상장이 더 늦으면 상장일 */
const FULL_BACKFILL_YEARS = 5;
/** 첫 봉이 하한에서 이만큼 안이면 앞쪽은 다 받은 것으로 본다 — 하한 날이 휴장 · 연휴면 첫 봉이 며칠 늦다 */
const FULL_BACKFILL_SLACK_DAYS = 10;
/** 밤 회차가 멈추는 KST 시각 — 07:30 마스터 동기화 · 08:30 시세 창 전에 한도를 비워 둔다 */
const FULL_STOP_KST = { hour: 7, minute: 20 };

type FullWork = { code: string; from: string; to: string; direction: "forward" | "audit" | "backward" };

/** 이 KST 요일(토)의 회차는 전 종목 앞쪽 끝도 한 페이지 받아 대조한다 — 겹침 창이 놓친 재작성(서버가 꺼져 있던 동안 등) */
const AUDIT_WEEKDAY = 6;

/**
 * 전 종목 일봉(FR-40 · `FC-REQ-020` FR-7). 상장 보통주 약 2,450 종목 × 5년 — 시세 유니버스(약 50)와 따로 돈다.
 *
 * 모의 키 처리량이 약 2건/s 라 첫 백필은 약 3.4만 호출 · 5시간 남짓이다. 그래서 **밤에만** 돌고(워커: 평일 18:00 ·
 * 주말 08:00 시작) 다음 07:20 KST 에 새 요청을 멈춘다. 다 못 받은 종목은 다음 회차가 저장된 봉에서 잇는다 —
 * 진행 상태를 따로 두지 않고 **저장된 첫 · 마지막 봉**이 진행 표시다. 같은 프로세스에서 회차가 겹치면 뒤 회차는 건너뛴다.
 *
 * 순서: ① 전 종목 증분(마지막 봉 날짜 앞 `REWRITE_OVERLAP_DAYS` 일부터 오늘까지, 대개 한 호출 — 겹친 봉으로 수정주가
 * 재작성 판정, FR-42) ② 토요일이면 전 종목 앞쪽 끝 한 페이지 대조(약 2,600 호출) ③ 앞쪽 백필(첫 봉 직전부터 **거꾸로** 140일씩).
 * 재작성이면 그 종목 이력을 통째로 다시 받아 바꾼다(`applyDailyPage`).
 * 거꾸로 받다가 빈 페이지가 나오면 그 종목의 앞쪽은 끝이다(상장일 정보가 없거나 KIS 수정주가 이력이 짧은 종목) —
 * 그 종목은 다음 밤에도 한 호출만 쓴다. 정규장(`J`) 수정주가만(`KisClient.dailyCandles`).
 */
export class SyncKrFullDailyCandles {
  private running = false;

  constructor(
    private readonly kis: KrStockQuotePort,
    private readonly store: KrStockStore,
    private readonly now: () => Date = () => new Date()
  ) {}

  /** 지금 이후 첫 07:20 KST */
  stopAt(at: Date): Date {
    const today = kstDateOf(at);
    const stop = kstAt(today, FULL_STOP_KST.hour, FULL_STOP_KST.minute);
    return stop > at ? stop : kstAt(addKstDays(today, 1), FULL_STOP_KST.hour, FULL_STOP_KST.minute);
  }

  /** 할 일 — 증분 먼저(오늘 값이 빠지지 않게), 토요일이면 앞쪽 끝 대조(FR-42), 그다음 앞쪽 백필 */
  plan(
    listings: Array<{ code: string; listedAt: Date | null }>,
    range: Map<string, { earliest: Date; latest: Date }>,
    today: string
  ): FullWork[] {
    const floor = addKstDays(today, -Math.round(FULL_BACKFILL_YEARS * 365.25));
    const auditDay = new Date(`${today}T00:00:00Z`).getUTCDay() === AUDIT_WEEKDAY;
    const forward: FullWork[] = [];
    const audit: FullWork[] = [];
    const backward: FullWork[] = [];
    for (const { code, listedAt } of listings) {
      const listed = listedAt ? listedAt.toISOString().slice(0, 10) : null;
      const start = listed && listed > floor ? listed : floor;
      const r = range.get(code);
      if (!r) {
        backward.push({ code, from: start, to: today, direction: "backward" });
        continue;
      }
      const latest = kstDateOf(r.latest);
      if (latest < today) {
        forward.push({ code, from: addKstDays(latest, -REWRITE_OVERLAP_DAYS), to: today, direction: "forward" });
      }
      if (auditDay) {
        const first = kstDateOf(r.earliest);
        audit.push({ code, from: first, to: addKstDays(first, PAGE_CALENDAR_DAYS - 1), direction: "audit" });
      }
      const earliest = kstDateOf(r.earliest);
      if (earliest > addKstDays(start, FULL_BACKFILL_SLACK_DAYS)) {
        backward.push({ code, from: start, to: addKstDays(earliest, -1), direction: "backward" });
      }
    }
    return [...forward, ...audit, ...backward];
  }

  async execute() {
    if (this.running) {
      logger.info("🗄️ 국내 주식 전 종목 일봉 — 이전 회차가 아직 돈다, 건너뜀");
      return { skipped: true as const };
    }
    this.running = true;
    try {
      return await this.run();
    } finally {
      this.running = false;
    }
  }

  private async run() {
    const startedAt = this.now();
    const stop = this.stopAt(startedAt);
    const today = kstDateOf(startedAt);
    const listings = await this.store.commonStockListings();
    const range = await this.store.dailyCandleRange(listings.map((l) => l.code));
    const work = this.plan(listings, range, today);
    const auditing = work.some((w) => w.direction === "audit");
    const [recent, oldest] = await Promise.all([
      this.store.edgeDailyCloses(listings.map((l) => l.code), "latest", REWRITE_OVERLAP_DAYS),
      auditing
        ? this.store.edgeDailyCloses(listings.map((l) => l.code), "earliest", PAGE_CALENDAR_DAYS)
        : Promise.resolve(new Map<string, Array<{ timestamp: Date; close: number }>>()),
    ]);

    let requests = 0;
    let candles = 0;
    let failed = 0;
    let rewritten = 0;
    // 대조가 이미 통째로 다시 받은 종목은 같은 회차의 다른 일을 건너뛴다
    const replaced = new Set<string>();
    let done = 0;
    let stopped = false;

    await mapConcurrent(work, KIS_CONCURRENCY, async (w) => {
      if (stopped || this.now() >= stop) {
        stopped = true;
        return;
      }
      try {
        if (replaced.has(w.code)) {
          done++;
          return;
        }
        if (w.direction === "forward" || w.direction === "audit") {
          const r = range.get(w.code)!;
          const page = await fetchDailyRange(this.kis, w.code, w.from, w.to);
          const stored = (w.direction === "forward" ? recent : oldest).get(w.code) ?? [];
          const applied = await applyDailyPage(this.kis, this.store, w.code, page.candles, stored, r, today);
          requests += page.requests + applied.requests;
          candles += applied.candles;
          if (applied.rewrite) {
            rewritten++;
            replaced.add(w.code);
          }
        } else {
          let to = w.to;
          while (to >= w.from) {
            if (this.now() >= stop) {
              stopped = true;
              return;
            }
            const from = [addKstDays(to, -(PAGE_CALENDAR_DAYS - 1)), w.from].sort().reverse()[0];
            const page = await this.kis.dailyCandles(w.code, from, to);
            requests++;
            if (page.length === 0) break;
            await this.store.upsertDailyCandles(w.code, page);
            candles += page.length;
            to = addKstDays(from, -1);
          }
        }
        done++;
      } catch (error) {
        failed++;
        logger.warn(`국내 주식 전 종목 일봉 실패 — ${w.code}: ${(error as Error).message}`);
      }
    });

    const remaining = work.length - done - failed;
    logger.info(
      `🗄️ 국내 주식 전 종목 일봉: 대상 ${listings.length} · 할 일 ${work.length}${auditing ? "(앞쪽 대조 포함)" : ""} · 끝 ${done} · 요청 ${requests} · 봉 ${candles} · 재작성 ${rewritten} · 실패 ${failed} · 남음 ${remaining}${stopped ? " (07:20 멈춤 — 다음 밤에 잇는다)" : ""}`
    );
    return {
      skipped: false as const,
      listings: listings.length,
      work: work.length,
      done,
      requests,
      candles,
      rewritten,
      failed,
      remaining,
      stopped,
    };
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
 * - 그 밖이어도 **시세가 한 번도 없는 유니버스 종목**은 받는다 — 밤에 처음 기록한 보유 · 관심이 아침까지 평가 0 으로
 *   남지 않게(F011 슬라이스 3b). 대개 0건이라 조회 두 번으로 끝난다
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
    let codes: string[];
    if (due || bootFill) {
      this.polledOnce = true;
      // 실시간 값이 90초 안에 들어온 종목은 체결이 이미 현재가를 준다 — 상하한 · PER 같은 나머지 칸만 5분마다 채운다
      const fullRefresh = minute % OFF_REGULAR_EVERY_MINUTES === 0;
      const realtime = fullRefresh ? new Set<string>() : new Set(await this.store.realtimeFreshCodes(new Date(at.getTime() - 90_000)));
      codes = (await this.universe.execute()).filter((code) => !realtime.has(code));
    } else {
      // 시간외 단일가 중엔 받지 않는다 — 그 시간 현재가는 시간외 값이다
      if (session.session === "after_hours_single") return { skipped: true as const, session: session.session };
      const universe = await this.universe.execute();
      const stored = new Set((await this.store.quotes({ codes: universe, limit: universe.length, offset: 0 })).map((q) => q.code));
      codes = universe.filter((code) => !stored.has(code));
      if (codes.length === 0) return { skipped: true as const, session: session.session };
    }
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

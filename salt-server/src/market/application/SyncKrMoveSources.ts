import { logger } from "../../shared/config/logger";
import {
  isKrNewsPollMinute,
  isKrNewsPromo,
  isKrQuoteWindow,
  isKrRateLimited,
  krNewsKindOf,
  kstDateOf,
  KR_FLOW_INTRADAY_RETENTION_DAYS,
  KR_NEWS_MAX_PAGES,
  KR_NEWS_RETENTION_DAYS,
  KR_VI_RETENTION_DAYS,
  KR_INDEX_DAILY_PAGE,
  KR_INDEX_DAILY_REFILL_BELOW,
  KR_INDEX_DAILY_SESSIONS,
  KR_MARKET_INDEX_CODES,
  krIndexDailyRows,
  type KrIndexDailyClose,
  type KrMarketCalendarStore,
  type KrMoveSourcePort,
  type KrMoveSourceStore,
  type KrNewsTitleFact,
  type KrProgramFlowFact,
  type KrSectorIndexFact,
} from "../domain";
import { loadKrSession, type ResolveKrStockUniverse } from "./SyncKrStock";

/**
 * 국내 등락 원천 수집(F016 단계 B · `SRV-REQ-051` FR-1 · 4 · 5). 워커가 매분 부르고 부를지는 여기서 정한다.
 * 셋 다 KIS 한도 맨 뒤(부가)라 초과(`EGW00201`)를 만나면 그 회차를 접고 받은 것만 저장한다(FR-91).
 */

const DAY_MS = 86_400_000;
/** 연속 실패가 이만큼이면 회차를 멈춘다 — 장애 중 유니버스 전체를 두드리지 않게(투자자 동향과 같은 값) */
const CIRCUIT_FAILURES = 5;
/**
 * 연속 **초과**가 이만큼이면 회차를 양보한다. 처음엔 초과 한 번에 접었는데(투자자 동향과 같은 규칙) 장중엔 현재가도 초과율이 40% 를 넘어
 * (2026-11-06 13:00~13:10 현재가 93/202) 재시도 끝 초과가 첫 종목에서 나 매 회차 0/50 이었다 — 같은 자리에서 접히니 영영 안 쌓인다.
 * 초과 한 건은 그 종목만 건너뛰고(재시도 · 감속은 클라이언트가 이미 했다), 연달아 막힐 때만 다음 회차에 양보한다
 */
const YIELD_AFTER_RATE_LIMITED = 3;
/**
 * 종목 · 업종 호출 사이 간격 — 부가 작업이 몰리면 KIS 초과가 나고, 초과는 클라이언트가 **모든 호출**을 잠깐 세운다(현재가 포함).
 * 2026-11-06 13:40 측정: 프로그램(50건) · 업종(8건) 회차가 시작되는 분에 폴링 종목 현재가가 1분 회차를 한 번 건너뛰어 75~105초 묵었다
 * (평소 12~45초 · 실시간 종목은 무관). 1초 간격이면 이 작업은 초당 1건을 넘지 않고, 프로그램 한 회차는 약 1분 · 업종은 10초
 */
export const KR_SUPPLEMENT_SPACING_MS = 1_000;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * 시황/공시 제목(FR-1) — **시장 전체 한 번 호출**(종목마다가 아니다 — 2026-11-06 실측, 종목 칸을 비우면 시장 전체 40건). 최신 쪽부터
 * 받아 가장 오래된 행이 이미 받은 마지막 게시 시각보다 늦으면 그 시각 앞으로 한 쪽 더(`KR_NEWS_MAX_PAGES` 까지). 광고성은
 * 행에 표시만 한다(패턴 = 서버 설정). 관련 종목이 없는 제목(정치 · 사회)은 저장하지 않는다 — 종목 화면에 쓸 데가 없다
 */
export class PollKrNewsTitles {
  constructor(
    private readonly kis: KrMoveSourcePort,
    private readonly store: KrMoveSourceStore,
    private readonly promoPatterns: readonly RegExp[],
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute({ force = false }: { force?: boolean } = {}) {
    const at = this.now();
    if (!force && !isKrNewsPollMinute(at)) return { skipped: true as const };

    const latest = await this.store.latestNewsPublishedAt();
    const facts: KrNewsTitleFact[] = [];
    let pages = 0;
    let before: { date: string; hhmmss: string } | null = null;
    try {
      while (pages < KR_NEWS_MAX_PAGES) {
        const page = await this.kis.newsTitlesPage(before);
        pages++;
        facts.push(...page);
        if (page.length === 0) break;
        const oldest = page.reduce((a, b) => (a.publishedAt.getTime() <= b.publishedAt.getTime() ? a : b)).publishedAt;
        // 처음이면(표가 비었으면) 한 쪽만 — 지난 30일을 거슬러 받지 않는다
        if (!latest || oldest.getTime() <= latest.getTime()) break;
        const next = kstHhmmss(oldest);
        // 같은 초에 40건이 몰리면 쪽이 넘어가지 않는다 — 그 앞은 다음 회차가 아니라 놓친다(기록만)
        if (before && before.date === next.date && before.hhmmss === next.hhmmss) break;
        before = next;
      }
    } catch (error) {
      if (!isKrRateLimited(error)) logger.warn(`국내 시황 제목 실패: ${(error as Error).message}`);
    }
    const linked = facts.filter((f) => f.codes.length > 0);
    const saved = await this.store.saveNewsTitles(
      linked.map((f) => ({ ...f, kind: krNewsKindOf(f.providerName), promo: isKrNewsPromo(f.title, this.promoPatterns) })),
      this.now()
    );
    return { skipped: false as const, pages, received: facts.length, linked: linked.length, saved };
  }
}

/**
 * 업종 지수(FR-4) — 유니버스 종목의 지수업종 대분류만(2026-11-06 유니버스 8종). 박자는 워커 cron(장중 30분 + 15:40) — 매분 · 5분 판이
 * 시세 폴링 회차를 1분 넘게 늘려 다음 분을 건너뛰게 했다(2026-11-06). 분해(단계 C)는 그날 등락 · 일별 종가만 쓴다. 15:40 회차가 그날 종가
 */
export class PollKrSectorIndices {
  constructor(
    private readonly kis: KrMoveSourcePort,
    private readonly store: KrMoveSourceStore,
    private readonly calendar: KrMarketCalendarStore,
    private readonly universe: ResolveKrStockUniverse,
    private readonly now: () => Date = () => new Date(),
    private readonly pause: (ms: number) => Promise<void> = wait
  ) {}

  async execute() {
    const at = this.now();
    const session = await loadKrSession(this.calendar, at);
    // 박자(5분)는 워커 cron — 여기선 장 시간 창만 본다. 15:40 회차가 장 끝 값(그날 종가)을 받는다
    if (!isKrQuoteWindow(session)) return { skipped: true as const };
    const sectors = [...new Set((await this.store.sectorIndexCodes(await this.universe.execute())).values())].sort();
    const facts: KrSectorIndexFact[] = [];
    // 초과 한 건에 회차를 접지 않는다(프로그램 매매와 같은 규칙) — 2026-11-06 15:40 종가 회차가 첫 업종의 초과 하나로 0행이었다
    // (그 분 현재가 초과가 몰렸다, 서버 로그). 그날 종가는 기간별 시세(`BackfillKrIndexDaily`)가 16:05 에 다시 덮는다
    const counter = new SupplementFailures();
    for (const [i, code] of sectors.entries()) {
      if (i > 0) await this.pause(KR_SUPPLEMENT_SPACING_MS);
      try {
        const q = await this.kis.indexQuote(code);
        facts.push({ code: q.code, value: q.value, change: q.change, changeRate: q.changeRate });
        counter.ok();
      } catch (error) {
        if (counter.fail(error, `국내 업종 지수 실패 — ${code}`)) break;
      }
    }
    await this.store.upsertSectorIndices(facts, this.now());
    return { skipped: false as const, sectors: sectors.length, saved: facts.length, failed: counter.failed, yielded: counter.yielded };
  }
}

/**
 * 장중 프로그램 매매(FR-5) — 유니버스 종목마다 한 번, 정규장 10분마다(+ 종가 단일가 · 15:40 회차가 그날 마지막 누적). 체결 시각이 같으면
 * 행이 늘지 않는다. **몇 분마다인지는 워커 cron 이 정한다**(`*\/10`) — 여기서 지금 분을 다시 보면 늦게 시작한 회차를 통째로 버린다
 * (2026-11-06 12:00 회차가 시세 사슬 뒤에서 12:01 에 시작해 0행). 여기선 장 상태만 본다
 */
export class PollKrProgramFlows {
  constructor(
    private readonly kis: KrMoveSourcePort,
    private readonly store: KrMoveSourceStore,
    private readonly calendar: KrMarketCalendarStore,
    private readonly universe: ResolveKrStockUniverse,
    private readonly now: () => Date = () => new Date(),
    private readonly pause: (ms: number) => Promise<void> = wait
  ) {}

  async execute() {
    const at = this.now();
    const session = await loadKrSession(this.calendar, at);
    const trading =
      session.session === "regular" || session.session === "closing_auction" || session.session === "after_hours_close";
    if (!trading) return { skipped: true as const };

    const codes = await this.universe.execute();
    const facts: KrProgramFlowFact[] = [];
    const counter = new SupplementFailures();
    for (const [i, code] of codes.entries()) {
      if (i > 0) await this.pause(KR_SUPPLEMENT_SPACING_MS);
      try {
        const fact = await this.kis.programFlow(code);
        if (fact && kstDateOf(fact.at) === kstDateOf(at)) facts.push(fact);
        counter.ok();
      } catch (error) {
        if (counter.fail(error, `국내 프로그램 매매 실패 — ${code}`)) break;
      }
    }
    await this.store.appendProgramFlows(facts, this.now());
    const { failed, yielded } = counter;
    // 회차마다 한 줄 — 0행 회차가 조용히 지나가지 않게(2026-11-06 원인을 로그 없이 찾느라 늦었다)
    logger.info(`🇰🇷 국내 프로그램 매매: ${facts.length}/${codes.length}종목 · 실패 ${failed}${yielded ? " · 한도 초과로 양보" : ""}`);
    return { skipped: false as const, codes: codes.length, saved: facts.length, failed, yielded };
  }
}

/**
 * 지수 · 업종 일별 이력(F016 단계 C — β 재료). 시장 지수 셋 + 유니버스 종목의 업종. 저장된 행이 `KR_INDEX_DAILY_SESSIONS` 보다 적으면
 * 기간별 시세를 거슬러 쪽 넘김(처음 한 번 약 6쪽), 그 뒤엔 최근 한 쪽만(맥 수면으로 며칠 놓쳐도 메운다 · 장중 마지막 값을 공식 종가로 덮는다).
 * 장 마감 뒤 하루 한 번 + 기동 때. 초과 규칙은 다른 부가 작업과 같다
 */
export class BackfillKrIndexDaily {
  constructor(
    private readonly kis: KrMoveSourcePort,
    private readonly store: KrMoveSourceStore,
    private readonly universe: ResolveKrStockUniverse,
    private readonly now: () => Date = () => new Date(),
    private readonly pause: (ms: number) => Promise<void> = wait
  ) {}

  /** 한 지수에 넘길 최대 쪽 수 — 250 거래일 / 50 + 여유(휴장 많은 구간) */
  static readonly MAX_PAGES = 8;

  async execute() {
    const sectors = new Set((await this.store.sectorIndexCodes(await this.universe.execute())).values());
    const codes = [...KR_MARKET_INDEX_CODES, ...[...sectors].sort()];
    const coverage = await this.store.indexDailyCoverage(codes);
    const today = kstDateOf(this.now());
    const counter = new SupplementFailures();
    let calls = 0;
    let saved = 0;
    const names: Array<{ code: string; name: string }> = [];
    outer: for (const code of codes) {
      const have = coverage.get(code);
      const deep = !have || have.count < KR_INDEX_DAILY_REFILL_BELOW;
      const closes: KrIndexDailyClose[] = [];
      let to = today;
      for (let page = 0; page < (deep ? BackfillKrIndexDaily.MAX_PAGES : 1); page++) {
        if (calls > 0) await this.pause(KR_SUPPLEMENT_SPACING_MS);
        calls++;
        let rows: KrIndexDailyClose[];
        try {
          // 달력 100일 ≈ 68 거래일 > 한 쪽(50) — 쪽이 다 차게 넉넉히
          const page = await this.kis.indexDailyCloses(code, shiftDate(to, -100), to);
          rows = page.closes;
          if (page.name && !names.some((n) => n.code === code)) names.push({ code, name: page.name });
          counter.ok();
        } catch (error) {
          if (counter.fail(error, `국내 지수 일별 실패 — ${code}`)) {
            saved += await this.save(code, closes);
            break outer;
          }
          break;
        }
        closes.push(...rows);
        const oldest = rows.reduce<string | null>((m, r) => (m === null || r.tradeDate < m ? r.tradeDate : m), null);
        if (rows.length < KR_INDEX_DAILY_PAGE || oldest === null) break;
        if (new Set(closes.map((c) => c.tradeDate)).size >= KR_INDEX_DAILY_SESSIONS) break;
        to = shiftDate(oldest, -1);
      }
      saved += await this.save(code, closes);
    }
    await this.store.upsertIndexNames(names, this.now());
    logger.info(`🇰🇷 국내 지수 일별: ${codes.length}지수 · 호출 ${calls} · 저장 ${saved}행 · 실패 ${counter.failed}${counter.yielded ? " · 한도 초과로 양보" : ""}`);
    return { codes: codes.length, calls, saved, failed: counter.failed, yielded: counter.yielded };
  }

  /**
   * 받은 종가 → 일별 행(맨 앞 행은 앞 종가가 없어 빠진다 — 이미 있는 행이다). **오늘 행은 장 마감(16:00 KST) 뒤에만** — 장 전 · 장중에도
   * 원천이 오늘 날짜 행을 준다(2026-11-09 08:43 기동 회차가 11-09 행을 썼다 — 종가가 아니다). 장중 값은 업종 회차가 따로 쓴다
   */
  private async save(code: string, closes: KrIndexDailyClose[]) {
    const now = this.now();
    const today = kstDateOf(now);
    const closed = new Date(now.getTime() + 9 * 3_600_000).getUTCHours() >= 16;
    const rows = krIndexDailyRows(closes.filter((c) => c.tradeDate < today || closed));
    await this.store.upsertIndexDaily(code, rows, this.now());
    return rows.length;
  }
}

/**
 * 부가 작업(업종 · 프로그램 · 지수 일별)의 실패 셈 — 초과 한 건은 그 대상만 건너뛰고 연달아 셋이면 양보, 다른 실패는 연달아 다섯이면 멈춘다.
 * 세 작업이 같은 규칙이어야 한다(2026-11-06 프로그램만 고쳐 업종 15:40 회차가 초과 하나로 0행) — 그래서 한 곳
 */
export class SupplementFailures {
  failed = 0;
  yielded = false;
  private consecutive = 0;
  private rateLimitedInRow = 0;

  ok() {
    this.consecutive = 0;
    this.rateLimitedInRow = 0;
  }

  /** 실패 하나 — 회차를 멈춰야 하면 `true` */
  fail(error: unknown, label: string): boolean {
    this.failed++;
    if (isKrRateLimited(error)) {
      this.rateLimitedInRow++;
      if (this.rateLimitedInRow >= YIELD_AFTER_RATE_LIMITED) this.yielded = true;
      return this.yielded;
    }
    this.rateLimitedInRow = 0;
    this.consecutive++;
    logger.warn(`${label}: ${(error as Error).message}`);
    return this.consecutive >= CIRCUIT_FAILURES;
  }
}

const shiftDate = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/** 보관 기한 정리 — 제목 30일 · 장중 수급 7일 · VI 사건 30일(단계 A 가 남긴 것). 장 마감 뒤 하루 한 번 */
export class PruneKrMoveSources {
  constructor(
    private readonly store: KrMoveSourceStore,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute() {
    const at = this.now().getTime();
    const removed = await this.store.prune({
      news: new Date(at - KR_NEWS_RETENTION_DAYS * DAY_MS),
      flows: new Date(at - KR_FLOW_INTRADAY_RETENTION_DAYS * DAY_MS),
      viEvents: new Date(at - KR_VI_RETENTION_DAYS * DAY_MS),
    });
    logger.info(`🇰🇷 국내 등락 원천 정리: 제목 ${removed.news} · 장중 수급 ${removed.flows} · VI ${removed.viEvents}`);
    return removed;
  }
}

/** 실제 시각 → KST 날짜 · hhmmss(쪽 넘김 입력) */
const kstHhmmss = (at: Date) => {
  const kst = new Date(at.getTime() + 9 * 3_600_000).toISOString();
  return { date: kst.slice(0, 10), hhmmss: kst.slice(11, 19).replaceAll(":", "") };
};

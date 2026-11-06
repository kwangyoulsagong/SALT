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
 * 업종 지수(FR-4) — 유니버스 종목의 지수업종 대분류만(2026-11-06 유니버스 8종). 장 시간 창(08:30~16:00) 5분마다 — 매분이던 첫 판이
 * 분당 8건을 더해 장중 초과를 키웠다(2026-11-06). 분해(단계 C)는 그날 등락 · 일별 종가만 쓴다 — 5분이면 족하다. 15:40 회차가 그날 종가
 */
export class PollKrSectorIndices {
  constructor(
    private readonly kis: KrMoveSourcePort,
    private readonly store: KrMoveSourceStore,
    private readonly calendar: KrMarketCalendarStore,
    private readonly universe: ResolveKrStockUniverse,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute() {
    const at = this.now();
    const session = await loadKrSession(this.calendar, at);
    // 박자(5분)는 워커 cron — 여기선 장 시간 창만 본다. 15:40 회차가 장 끝 값(그날 종가)을 받는다
    if (!isKrQuoteWindow(session)) return { skipped: true as const };
    const sectors = [...new Set((await this.store.sectorIndexCodes(await this.universe.execute())).values())].sort();
    const facts: KrSectorIndexFact[] = [];
    let failed = 0;
    for (const code of sectors) {
      try {
        const q = await this.kis.indexQuote(code);
        facts.push({ code: q.code, value: q.value, change: q.change, changeRate: q.changeRate });
      } catch (error) {
        failed++;
        if (isKrRateLimited(error)) break;
        logger.warn(`국내 업종 지수 실패 — ${code}: ${(error as Error).message}`);
        if (failed >= CIRCUIT_FAILURES) break;
      }
    }
    await this.store.upsertSectorIndices(facts, this.now());
    return { skipped: false as const, sectors: sectors.length, saved: facts.length, failed };
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
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute() {
    const at = this.now();
    const session = await loadKrSession(this.calendar, at);
    const trading =
      session.session === "regular" || session.session === "closing_auction" || session.session === "after_hours_close";
    if (!trading) return { skipped: true as const };

    const codes = await this.universe.execute();
    const facts: KrProgramFlowFact[] = [];
    let failed = 0;
    let consecutive = 0;
    let rateLimitedInRow = 0;
    let yielded = false;
    for (const code of codes) {
      try {
        const fact = await this.kis.programFlow(code);
        if (fact && kstDateOf(fact.at) === kstDateOf(at)) facts.push(fact);
        consecutive = 0;
        rateLimitedInRow = 0;
      } catch (error) {
        failed++;
        if (isKrRateLimited(error)) {
          rateLimitedInRow++;
          if (rateLimitedInRow >= YIELD_AFTER_RATE_LIMITED) {
            yielded = true;
            break;
          }
          continue;
        }
        rateLimitedInRow = 0;
        consecutive++;
        logger.warn(`국내 프로그램 매매 실패 — ${code}: ${(error as Error).message}`);
        if (consecutive >= CIRCUIT_FAILURES) break;
      }
    }
    await this.store.appendProgramFlows(facts, this.now());
    // 회차마다 한 줄 — 0행 회차가 조용히 지나가지 않게(2026-11-06 원인을 로그 없이 찾느라 늦었다)
    logger.info(`🇰🇷 국내 프로그램 매매: ${facts.length}/${codes.length}종목 · 실패 ${failed}${yielded ? " · 한도 초과로 양보" : ""}`);
    return { skipped: false as const, codes: codes.length, saved: facts.length, failed, yielded };
  }
}

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

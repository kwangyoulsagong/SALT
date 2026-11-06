import { logger } from "../../shared/config/logger";
import {
  isKrNewsPollMinute,
  isKrNewsPromo,
  isKrProgramPollMinute,
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
/** 장전 · 장후 시간외 종가엔 5분 간격 — 지수 회차와 같은 박자(장 끝 값을 15:40 회차가 받아 그날 종가가 된다) */
const SECTOR_OFF_REGULAR_EVERY_MINUTES = 5;
/** 연속 실패가 이만큼이면 회차를 멈춘다 — 장애 중 유니버스 전체를 두드리지 않게(투자자 동향과 같은 값) */
const CIRCUIT_FAILURES = 5;

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
 * 업종 지수(FR-4) — 유니버스 종목의 지수업종 대분류만(2026-11-06 표본 대분류 19종 · 유니버스는 그보다 적다). 정규장 매분 ·
 * 장전 · 장후 5분마다 — 지수 3종(`PollKrIndices`)과 같은 박자라 15:40 회차가 장 끝 값을 받는다(그날 종가)
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
    const regular = session.session === "regular" || session.session === "closing_auction";
    const minute = Math.floor(at.getTime() / 60_000);
    if (!(regular || (isKrQuoteWindow(session) && minute % SECTOR_OFF_REGULAR_EVERY_MINUTES === 0))) {
      return { skipped: true as const };
    }
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
 * 행이 늘지 않는다
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
    if (!trading || !isKrProgramPollMinute(at)) return { skipped: true as const };

    const codes = await this.universe.execute();
    const facts: KrProgramFlowFact[] = [];
    let failed = 0;
    let consecutive = 0;
    let yielded = false;
    for (const code of codes) {
      try {
        const fact = await this.kis.programFlow(code);
        if (fact && kstDateOf(fact.at) === kstDateOf(at)) facts.push(fact);
        consecutive = 0;
      } catch (error) {
        failed++;
        consecutive++;
        if (isKrRateLimited(error)) {
          yielded = true;
          break;
        }
        logger.warn(`국내 프로그램 매매 실패 — ${code}: ${(error as Error).message}`);
        if (consecutive >= CIRCUIT_FAILURES) break;
      }
    }
    await this.store.appendProgramFlows(facts, this.now());
    if (yielded || failed > 0) {
      logger.info(`🇰🇷 국내 프로그램 매매: ${facts.length}/${codes.length}종목 · 실패 ${failed}${yielded ? " · 한도 초과로 양보" : ""}`);
    }
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

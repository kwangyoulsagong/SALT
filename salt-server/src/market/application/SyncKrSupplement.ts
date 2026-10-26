import { logger } from "../../shared/config/logger";
import {
  isKrQuoteWindow,
  isKrRateLimited,
  isSettledInvestorDay,
  kstDateOf,
  type KrIndexQuoteFact,
  type KrMarketCalendarStore,
  type KrSupplementPort,
  type KrSupplementStore,
} from "../domain";
import { loadKrSession, type ResolveKrStockUniverse } from "./SyncKrStock";

/**
 * 국내 주식 부가 정보 수집(F011 슬라이스 6 · `SRV-REQ-040` FR-49 · 50).
 *
 * **둘 다 한도에서 맨 뒤다**(FR-91: 실시간 > 보유 · 관심 폴링 > 시총 폴링 > 일봉 > 부가). 그래서 한도 초과
 * (`EGW00201`)를 한 번이라도 만나면 그 회차를 그 자리에서 멈춘다 — 재시도로 줄을 붙잡지 않고 다음 회차에 양보한다.
 * 이미 받은 값은 저장한다.
 */

/** 장전 · 장후 시간외 종가엔 5분 간격 — 현재가 폴링과 같은 박자 */
const OFF_REGULAR_EVERY_MINUTES = 5;

/**
 * 지수 현재값(FR-49). 워커가 현재가 회차 뒤에 매분 부르고, 부를지는 여기서 정한다 — 정규장 매분 · 장전/장후 시간외
 * 종가 5분마다 · 그 밖엔 기동 뒤 한 번과 저장값이 없는 지수만. 지수 2~3개라 순서대로 부른다
 */
export class PollKrIndices {
  private polledOnce = false;

  constructor(
    private readonly kis: KrSupplementPort,
    private readonly store: KrSupplementStore,
    private readonly calendar: KrMarketCalendarStore,
    private readonly indices: readonly string[],
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute() {
    if (this.indices.length === 0) return { skipped: true as const, reason: "no_indices" as const };
    const at = this.now();
    const session = await loadKrSession(this.calendar, at);
    const minute = Math.floor(at.getTime() / 60_000);
    const regular = session.session === "regular" || session.session === "closing_auction";
    const due = regular || (isKrQuoteWindow(session) && minute % OFF_REGULAR_EVERY_MINUTES === 0);

    let codes: string[];
    if (due || !this.polledOnce) {
      this.polledOnce = true;
      codes = [...this.indices];
    } else {
      const stored = new Set((await this.store.indexQuotes([...this.indices])).map((q) => q.code));
      codes = this.indices.filter((code) => !stored.has(code));
      if (codes.length === 0) return { skipped: true as const, reason: "not_due" as const };
    }

    const facts: KrIndexQuoteFact[] = [];
    let failed = 0;
    for (const code of codes) {
      try {
        facts.push(await this.kis.indexQuote(code));
      } catch (error) {
        failed++;
        logger.warn(`국내 지수 실패 — ${code}: ${(error as Error).message}`);
        if (isKrRateLimited(error)) break;
      }
    }
    await this.store.upsertIndexQuotes(facts, this.now());
    return { skipped: false as const, updated: facts.length, failed };
  }
}

/** 연속 실패가 이만큼이면 회차를 멈춘다 — 장애에 한도만 태우지 않는다(현재가 폴링과 같은 값) */
const CIRCUIT_FAILURES = 5;

/**
 * 종목별 투자자 순매수(FR-50) — 개장일 저녁 한 번, 유니버스(보유 → 관심 → 시총 순)만. 종목마다 최근 30거래일을 받아
 * 덮는다 — 처음 보는 종목도 첫 회차에 30거래일이 차고, 어제 저장한 잠정치는 오늘 확정치로 바뀐다.
 * 당일 행은 18:00 KST 뒤에만 저장한다(`isSettledInvestorDay`).
 */
export class SyncKrInvestorFlows {
  constructor(
    private readonly kis: KrSupplementPort,
    private readonly store: KrSupplementStore,
    private readonly calendar: KrMarketCalendarStore,
    private readonly universe: ResolveKrStockUniverse,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute() {
    const at = this.now();
    const today = kstDateOf(at);
    // 휴장일엔 새 거래일이 없다 — 달력을 모르면(평일 추정) 받는다
    const [day] = await this.calendar.days(today, today);
    if (day && !day.isOpen) return { skipped: true as const, reason: "closed" as const };

    const codes = await this.universe.execute();
    let saved = 0;
    let rows = 0;
    let failed = 0;
    let consecutive = 0;
    let yielded = false;
    for (const code of codes) {
      try {
        const flows = (await this.kis.investorFlows(code)).filter((f) => isSettledInvestorDay(f.date, this.now()));
        await this.store.upsertInvestorFlows(code, flows, this.now());
        saved++;
        rows += flows.length;
        consecutive = 0;
      } catch (error) {
        failed++;
        consecutive++;
        logger.warn(`국내 투자자 동향 실패 — ${code}: ${(error as Error).message}`);
        if (isKrRateLimited(error)) {
          yielded = true;
          break;
        }
        if (consecutive >= CIRCUIT_FAILURES) break;
      }
    }
    const stopped = yielded ? " · 한도 초과로 양보" : consecutive >= CIRCUIT_FAILURES ? " · 연속 실패로 중단" : "";
    logger.info(`🇰🇷 국내 투자자 동향: ${saved}/${codes.length}종목 · ${rows}행 · 실패 ${failed}${stopped}`);
    return { skipped: false as const, codes: codes.length, saved, rows, failed, yielded };
  }
}

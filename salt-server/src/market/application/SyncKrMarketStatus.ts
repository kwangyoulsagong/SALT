import { logger } from "../../shared/config/logger";
import {
  detectKrCircuitBreakers,
  isKrRateLimited,
  kstDateOf,
  KR_MARKET_INDEX,
  KR_VI_MAX_PAGES,
  KR_VI_REREAD_MS,
  type KrMarketAction,
  type KrMarketCalendarStore,
  type KrMarketStatusPort,
  type KrMarketStatusStore,
  type KrSessionView,
  type KrSupplementStore,
  type KrViEventFact,
} from "../domain";
import { loadKrSession } from "./SyncKrStock";

/**
 * 국내 시장 상태 수집(F016 단계 A · `SRV-REQ-051` FR-2 · 3) — VI 사건과 서킷브레이커. 워커가 지수 회차 뒤에 매분 부르고,
 * 부를지는 여기서 정한다(정규장 · 종가 단일가만). 둘 다 한도 맨 뒤(부가)라 초과를 만나면 그 회차를 접는다(FR-91).
 */

const isTradingSession = (session: KrSessionView) =>
  session.session === "regular" || session.session === "closing_auction";

/**
 * VI 현황 — 시장 전체를 한 번에 받는다(쪽마다 30건, 발동 시각 내림차순). 쪽의 가장 오래된 발동이 `KR_VI_REREAD_MS` 보다
 * 앞이면 멈춘다 — 그 앞은 지난 회차가 받았다. 장 초반 몰림에도 `KR_VI_MAX_PAGES` 쪽에서 멈춘다(놓친 앞쪽 사건은 화면이
 * 현재가 상태 칸 `vi_cls_code` 로 여전히 VI 를 안다 — 종류 · 시각만 빈다)
 */
export class PollKrViEvents {
  constructor(
    private readonly kis: KrMarketStatusPort,
    private readonly store: KrMarketStatusStore,
    private readonly calendar: KrMarketCalendarStore,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute() {
    const at = this.now();
    const session = await loadKrSession(this.calendar, at);
    if (!isTradingSession(session)) return { skipped: true as const };

    const date = kstDateOf(at);
    const rereadFrom = at.getTime() - KR_VI_REREAD_MS;
    const events: KrViEventFact[] = [];
    let pages = 0;
    let continued = false;
    try {
      while (pages < KR_VI_MAX_PAGES) {
        const page = await this.kis.viEventsPage(date, continued);
        pages++;
        events.push(...page.events);
        const oldest = Math.min(...page.events.map((e) => e.triggeredAt.getTime()));
        if (!page.hasMore || page.events.length === 0 || oldest < rereadFrom) break;
        continued = true;
      }
    } catch (error) {
      // 받은 쪽은 저장한다 — 한도 초과는 다음 회차에 양보(FR-91), 그 밖은 로그만
      if (!isKrRateLimited(error)) logger.warn(`국내 VI 현황 실패: ${(error as Error).message}`);
    }
    await this.store.upsertViEvents(events, at);
    return { skipped: false as const, pages, events: events.length };
  }
}

/**
 * 서킷브레이커 추정(FR-3 — 장운영정보 실시간 필드 실측 전). 오늘 지수 분 기록 전체로 구간을 다시 찾아 덮는다 — 같은 기록이면
 * 같은 행이라 매분 돌려도 늘지 않는다. 전일 종가 = 현재 지수 − 전일 대비(같은 응답 값). 분 기록이 오늘 것이 아니면(장 전 ·
 * 휴장) 아무것도 쓰지 않는다 — 어제 기록과 오늘 전일 종가를 섞지 않게
 */
export class InferKrMarketActions {
  constructor(
    private readonly supplement: KrSupplementStore,
    private readonly store: KrMarketStatusStore,
    private readonly calendar: KrMarketCalendarStore,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute() {
    const at = this.now();
    const session = await loadKrSession(this.calendar, at);
    if (!isTradingSession(session)) return { skipped: true as const };

    const codes = Object.keys(KR_MARKET_INDEX);
    const [quotes, ticks] = await Promise.all([
      this.supplement.indexQuotes(codes),
      this.supplement.latestSessionIndexTicks(codes),
    ]);
    const today = kstDateOf(at);
    const actions: KrMarketAction[] = quotes.flatMap((q) => {
      const points = (ticks.get(q.code) ?? []).filter((p) => kstDateOf(p.at) === today);
      return detectKrCircuitBreakers(KR_MARKET_INDEX[q.code], points, q.value - q.change);
    });
    await this.store.upsertMarketActions(actions, at);
    return { skipped: false as const, actions: actions.length };
  }
}

import {
  moveSummaryFingerprint,
  selectMoveSummary,
  type MoveAsset,
  type MoveCardReader,
  type MoveSummaryStore,
  type MoveSummaryView,
} from "../domain";
import type { MoveSummaryDemand } from "./lib/moveSummaryDemand";

export interface GetMoveSummaryDeps {
  cards: MoveCardReader;
  store: MoveSummaryStore;
  demand: MoveSummaryDemand;
  /** `MOVE_SUMMARY=off` 면 `disabled`(FR-7) — ①② 는 market 경로라 그대로 */
  enabled: boolean;
  now?: () => Date;
}

/**
 * 오늘 등락 한 줄 읽기 (F016 단계 D · `SRV-REQ-052` FR-4 · FR-5). **LLM 0** — 저장값과 지금 카드를 대조만 한다.
 * 카드 하나 + 그날 시도 행 몇 개. 아직 없으면 `pending` 이고 배치가 다음 회차에 이 종목을 먼저 본다.
 * 없는 종목이면 `null`(404)
 */
export class GetMoveSummary {
  constructor(private readonly deps: GetMoveSummaryDeps) {}

  async execute(asset: MoveAsset, symbol: string): Promise<(MoveSummaryView & { date: string }) | null> {
    if (!this.deps.enabled) return { gate: "disabled", summary: null, date: "" };
    const now = this.deps.now?.() ?? new Date();
    const card = await this.deps.cards.card(asset, symbol);
    if (!card) return null;
    const view =
      card.show && card.split
        ? await (async () => {
            const day = await this.deps.store.day(asset, card.symbol, card.date, moveSummaryFingerprint(card));
            return selectMoveSummary({ enabled: true, card, current: day.current, latestOk: day.latestOk });
          })()
        : selectMoveSummary({ enabled: true, card, current: null, latestOk: null });
    if (view.gate === "pending") this.deps.demand.want(asset, card.symbol, now);
    return { ...view, date: card.date };
  }
}

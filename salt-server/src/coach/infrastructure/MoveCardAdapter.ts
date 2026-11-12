import type { MarketApi } from "../../market/application/api";
import type { MoveAsset, MoveCard, MoveCardReader, MoveSummaryFactKind } from "../domain";

const KINDS: ReadonlySet<string> = new Set<MoveSummaryFactKind>([
  "news",
  "disclosure",
  "vi",
  "market_action",
  "halt",
  "warning",
  "flow",
  "crypto_news",
  "crypto_warning",
]);

/**
 * `market` → `coach` ACL — "오늘 왜 움직였나" 카드(① · ②)를 ③ 한 줄의 재료로(F016 단계 D).
 * 모르는 사실 종류는 버린다(프롬프트에 문장이 없다). 시각은 Date 로
 */
export class MoveCardAdapter implements MoveCardReader {
  constructor(private readonly market: Pick<MarketApi, "whyMovedCard">) {}

  async card(asset: MoveAsset, symbol: string): Promise<MoveCard | null> {
    const view = await this.market.whyMovedCard(asset, symbol);
    if (!view) return null;
    return {
      asset,
      symbol: asset === "crypto" ? symbol.toUpperCase() : symbol,
      date: view.date,
      show: view.show,
      split: view.split,
      facts: view.facts
        .filter((f) => KINDS.has(f.kind))
        .map((f) => ({ id: f.id, kind: f.kind as MoveSummaryFactKind, at: new Date(f.at), source: f.source, title: f.title, value: f.value })),
    };
  }
}

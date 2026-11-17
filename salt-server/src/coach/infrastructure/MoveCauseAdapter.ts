import type { MarketApi } from "../../market/application/api";
import type { CauseSnapshotReader, MoveAsset, MoveCauseReader, PanelMoveCause } from "../domain";

type CauseView = NonNullable<Awaited<ReturnType<MarketApi["whyMovedCard"]>>>["cause"];

const toPanelCause = (cause: NonNullable<CauseView>): PanelMoveCause => ({
  causes: cause.causes.map((c) => ({
    kind: c.kind,
    strength: c.strength,
    headline: c.headline,
    note: c.note,
    factId: c.factId,
    at: c.at,
    evidence: c.evidence,
  })),
  result: cause.result,
});

/**
 * `market` → `coach` ACL — 원인 → 근거 → 결과를 한 장 패널의 원인 칸으로(F017 v4 1d) · 원인 스냅샷 재료로(5a).
 * 화면 경로 `…/why-moved` 와 같은 유스케이스를 `cause: true` 로 부른다 — 같은 재료 · 같은 규칙이라 세 자리가 어긋나지 않는다
 */
export class MoveCauseAdapter implements MoveCauseReader, CauseSnapshotReader {
  constructor(private readonly market: Pick<MarketApi, "whyMovedCard">) {}

  async cause(asset: MoveAsset, symbol: string): Promise<PanelMoveCause | null> {
    const view = await this.market.whyMovedCard(asset, symbol, { cause: true });
    return view?.cause ? toPanelCause(view.cause) : null;
  }

  async snapshot(asset: MoveAsset, symbol: string) {
    const view = await this.market.whyMovedCard(asset, symbol, { cause: true });
    if (!view?.cause) return null;
    return { split: view.split, cause: toPanelCause(view.cause) };
  }
}

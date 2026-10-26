import {
  DecisionOutcomeNotFoundError,
  normalizeTags,
  type DecisionOutcome,
  type DecisionOutcomeStore,
  type MarketProbe,
  type OutcomeAssetType,
} from "../domain";

/**
 * 결정 결과 목록 · 태그 확정 — FEATURE-009 FR-18 (`SRV-REQ-038` FR-9).
 *
 * 확정한 태그가 미러의 태그 비용에 쓰인다. 자동 후보(`autoTags`)는 원본으로 남는다 — 사용자 수정률이 자동 태그
 * 정확도의 대리 지표다(관측성). 빈 배열로 확정하면 "실수 없음"이다(확정 전과 다르다).
 */

export const DECISION_OUTCOME_LIST_MAX = 100;

/** 목록 한 줄 — 국내 청산은 종목 이름 · 로고를 같이 싣는다(코인은 화면이 시세 목록에서 찾는다 — `null`) */
export type ListedDecisionOutcome = DecisionOutcome & { name: string | null; logoUrl: string | null };

export class ListDecisionOutcomes {
  constructor(
    private readonly outcomes: DecisionOutcomeStore,
    /** 국내 종목 이름 · 로고(판단 사례와 같은 `assetLabels` — 국내는 마스터 전체). 없으면 이름 없이 */
    private readonly market: Pick<MarketProbe, "assetLabels"> | null = null
  ) {}

  /**
   * `assetType` 청산만(기본 코인 — 코인 미러 화면). 국내는 국내 미러 화면이 부른다(F011 FR-47).
   * 국내 코드는 화면의 코인 시세 목록에 없어 이니셜로 떨어졌다 — 서버가 이름 · 로고를 싣는다(실패해도 목록은 나간다)
   */
  async execute(userId: string, limit: number, assetType: OutcomeAssetType = "crypto"): Promise<ListedDecisionOutcome[]> {
    const rows = await this.outcomes.listOwned(userId, Math.min(limit, DECISION_OUTCOME_LIST_MAX), assetType);
    const labels =
      assetType === "kr_stock" && this.market && rows.length
        ? await this.market.assetLabels([...new Set(rows.map((row) => row.symbol))]).catch(() => [])
        : [];
    const bySymbol = new Map(labels.map((label) => [label.symbol, label]));
    return rows.map((row) => ({
      ...row,
      name: bySymbol.get(row.symbol)?.name ?? null,
      logoUrl: bySymbol.get(row.symbol)?.logoUrl ?? null,
    }));
  }
}

export class ConfirmOutcomeTags {
  constructor(
    private readonly outcomes: DecisionOutcomeStore,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(userId: string, outcomeId: string, tags: string[]): Promise<DecisionOutcome> {
    const updated = await this.outcomes.confirmTags(userId, outcomeId, normalizeTags(tags), this.now());
    if (!updated) throw new DecisionOutcomeNotFoundError();
    return updated;
  }
}

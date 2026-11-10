import type { UniverseSnapshotRow } from "../ports";

/**
 * 추적 목록 일별 스냅샷의 행(`DB-REQ-044` FR-1 · `SRV-REQ-057` FR-7) — 생존 편향 차단.
 * 코인은 활성 원화 마켓 전부. 국내는 수집 유니버스(보유 ∪ 관심 ∪ 시총 상위 N) — 한 종목 한 행, 출처는 보유 → 관심 → 시총 순서로
 * 하나(유니버스 순서와 같다). 순위는 시총 상위로 들어온 행만
 */
export const universeSnapshotRows = (input: {
  cryptoActive: readonly string[];
  kr: { held: readonly string[]; watched: readonly string[]; topByMarketCap: readonly string[] } | null;
}): UniverseSnapshotRow[] => {
  const rows = new Map<string, UniverseSnapshotRow>();
  for (const symbol of input.cryptoActive) {
    const upper = symbol.toUpperCase();
    rows.set(`crypto:${upper}`, { symbol: upper, assetType: "crypto", source: "active_market", rank: null });
  }
  if (input.kr) {
    const add = (code: string, source: UniverseSnapshotRow["source"], rank: number | null) => {
      const key = `kr_stock:${code}`;
      if (!rows.has(key)) rows.set(key, { symbol: code, assetType: "kr_stock", source, rank });
    };
    input.kr.held.forEach((code) => add(code, "holding", null));
    input.kr.watched.forEach((code) => add(code, "watch", null));
    input.kr.topByMarketCap.forEach((code, index) => add(code, "top_market_cap", index + 1));
  }
  return [...rows.values()];
};

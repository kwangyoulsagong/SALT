import type { MarketAssetType } from "../ports";

/** 추적 자산 한 개 — 관심 목록 행과 보유 행이 같은 열쇠로 만난다(`SRV-REQ-008` FR-80 · 81) */
export interface TrackedAssetKey {
  assetType: MarketAssetType;
  symbol: string;
}

export const trackedAssetKey = (asset: TrackedAssetKey): string => `${asset.assetType}:${asset.symbol.toUpperCase()}`;

/**
 * 상한에 드는 수 = **보유가 아닌 관심 종목 수**(`FEATURE-000` FR-41 · D8). 추적 자산은 관심 ∪ 보유인데 보유는 늘 추적되고
 * 세지 않는다 — 보유를 세면 많이 가진 사람이 관심 종목을 하나도 못 담는다.
 */
export const countTowardTrackingLimit = (
  watched: readonly TrackedAssetKey[],
  held: readonly TrackedAssetKey[]
): number => {
  const heldKeys = new Set(held.map(trackedAssetKey));
  return watched.filter((asset) => !heldKeys.has(trackedAssetKey(asset))).length;
};

/**
 * 새 관심 종목을 담을 수 있나. 보유 종목은 상한과 무관하게 담긴다(FR-81). 이미 넘은 상태(보유 매도로 관심만 남은 경우)를
 * **자동으로 정리하지 않는다** — 새 등록만 막는다(FR-85 · `FEATURE-000` OQ-2)
 */
export const canStartTracking = (input: {
  candidate: TrackedAssetKey;
  watched: readonly TrackedAssetKey[];
  held: readonly TrackedAssetKey[];
  limit: number;
}): boolean => {
  const candidateKey = trackedAssetKey(input.candidate);
  if (input.held.some((asset) => trackedAssetKey(asset) === candidateKey)) return true;
  return countTowardTrackingLimit(input.watched, input.held) < input.limit;
};

"use client";

import { useMemo } from "react";

import {
  indexWatchlistBySymbol,
  useWatchlist,
  WatchlistAssetType,
} from "@/entities/market";
import { WatchlistStarButton } from "@/features/toggle-watchlist";

/** 관심 별 본체 — `HeaderWatchlistStar` 가 브라우저에서만 불러온다 */
export const WatchlistStarLive = ({
  symbol,
  displayName,
  assetType = WatchlistAssetType.Crypto,
}: {
  symbol: string;
  displayName: string;
  /** 코인(기본) · 국내 주식(`FE-REQ-049` FR-1 — 국내 머리에도 별) */
  assetType?: WatchlistAssetType;
}) => {
  const watchlist = useWatchlist();
  const watched = useMemo(
    () => indexWatchlistBySymbol(watchlist.data?.items ?? []),
    [watchlist.data],
  );

  if (watchlist.isSignedOut) return null;
  return (
    <WatchlistStarButton
      entry={watched.get(symbol.toUpperCase())}
      displayName={displayName}
      request={{ assetType, symbol, name: displayName }}
    />
  );
};

export default WatchlistStarLive;

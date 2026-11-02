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
}: {
  symbol: string;
  displayName: string;
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
      request={{ assetType: WatchlistAssetType.Crypto, symbol, name: displayName }}
    />
  );
};

export default WatchlistStarLive;

"use client";

import { EmptyState } from "@repo/ui/emptyState";
import { FlexBox } from "@repo/ui/flexBox";
import { Text } from "@repo/ui/text";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  indexWatchlistBySymbol,
  MarketPreview,
  useMarketOverview,
  useWatchlist,
  WATCHLIST_MESSAGES,
  WatchlistAssetType,
  WatchlistTable,
} from "@/entities/market";
import { WatchlistStarButton } from "@/features/toggle-watchlist";

import { DEFAULT_MARKET_PARAMS } from "../model/previewParams";

/**
 * 관심 종목 탭 (`FE-REQ-010` FR-1 · FR-30~35).
 *
 * 원문에서 이 탭은 **눌러도 아무것도 렌더하지 않았다** — `MarketBoard` 가
 * `activeTab === "realtime"` 일 때만 본문을 그렸다.
 *
 * ## 프리뷰를 실시간 탭과 같은 컴포넌트로 그린다
 *
 * `MarketPreview` 는 시세 목록의 한 줄을 받는다. 관심 목록 응답에는 고가·저가·거래대금이
 * 없어서 그 모양을 만들 수 없다 — **만들지 않고 목록에서 찾는다.** 파라미터가 실시간
 * 탭과 같아서 대부분 캐시 적중이고, 목록 밖의 심볼(100위 밖)이면 패널이 자리만 지킨다.
 * 프리뷰를 이 탭 전용으로 새로 만들면 "실시간 탭과 같은 동작"(FR-32)이 두 구현이 된다.
 */
export const WatchlistTab = () => {
  const { data, isPending, isError, isSignedOut } = useWatchlist();
  const { data: overview } = useMarketOverview(DEFAULT_MARKET_PARAMS);

  const [selectedSymbol, setSelectedSymbol] = useState<string>("");

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const bySymbol = useMemo(() => indexWatchlistBySymbol(items), [items]);
  const firstSymbol = items[0]?.symbol;

  useEffect(() => {
    if (firstSymbol && !selectedSymbol) setSelectedSymbol(firstSymbol);
  }, [firstSymbol, selectedSymbol]);

  /** 목록에서 사라진 심볼이 선택된 채로 남지 않게 한다. */
  useEffect(() => {
    if (selectedSymbol && !bySymbol.has(selectedSymbol.toUpperCase())) {
      setSelectedSymbol(firstSymbol ?? "");
    }
  }, [bySymbol, firstSymbol, selectedSymbol]);

  const selectedSymbolItem = useMemo(
    () => overview?.items.find((item) => item.symbol === selectedSymbol),
    [overview?.items, selectedSymbol],
  );

  const renderAction = useCallback(
    (item: (typeof items)[number]) => (
      <WatchlistStarButton
        entry={item}
        displayName={item.name}
        request={{
          assetType: WatchlistAssetType.Crypto,
          symbol: item.symbol,
          name: item.name,
        }}
      />
    ),
    [],
  );

  if (isSignedOut) {
    return <Text color="tertiary">{WATCHLIST_MESSAGES.signInRequired}</Text>;
  }

  if (isPending) {
    return <Text color="tertiary">{WATCHLIST_MESSAGES.loading}</Text>;
  }

  if (isError) {
    return <Text color="tertiary">{WATCHLIST_MESSAGES.loadFailed}</Text>;
  }

  // 0건은 빈 상태다. **더미를 만들지 않는다** (FR-33)
  if (items.length === 0) {
    return (
      <EmptyState
        title={WATCHLIST_MESSAGES.emptyTitle}
        description={WATCHLIST_MESSAGES.emptyDescription}
      />
    );
  }

  return (
    <FlexBox justify="between" gap="2xl">
      <WatchlistTable
        items={items}
        selectedSymbol={selectedSymbol}
        onSelect={setSelectedSymbol}
        renderAction={renderAction}
      />
      <MarketPreview
        selectedSymbolItem={selectedSymbolItem}
        symbol={selectedSymbol}
      />
    </FlexBox>
  );
};

export default WatchlistTab;

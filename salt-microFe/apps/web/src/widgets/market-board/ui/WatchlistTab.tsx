"use client";

import { EmptyState } from "@repo/ui/emptyState";
import { StatusGraphic } from "@repo/ui/statusGraphic";
import { FlexBox } from "@repo/ui/flexBox";
import { Skeleton } from "@repo/ui/skeleton";
import { StatusLine } from "@repo/ui/statusLine";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  indexWatchlistBySymbol,
  MarketAssetClass,
  MarketPreview,
  overviewItemToPreviewSubject,
  useBoardOverview,
  useWatchlist,
  WATCHLIST_MESSAGES,
  watchlistItemToPreviewSubject,
  WatchlistAssetType,
  WatchlistTable,
} from "@/entities/market";
import { WatchlistStarButton } from "@/features/toggle-watchlist";

import { useDetailLink } from "../lib";
import { DEFAULT_MARKET_PARAMS } from "../model/previewParams";
import type { PreviewRenderer } from "../model/previewSlot";
import { previewPane, splitLayout, tablePane } from "./MarketBoardLayout.css";

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
export const WatchlistTab = ({
  renderPreview,
  assetClass: assetClassId = MarketAssetClass.Crypto,
}: {
  renderPreview?: PreviewRenderer;
  /** 관심 목록은 하나고 자산군 탭이 거른다(F011 `FE-REQ-041`) — 코인 탭엔 코인만, 국내 주식 탭엔 국내 주식만 */
  assetClass?: string;
}) => {
  // 탭 id(문자열)를 받는다 — `MarketBoard` 는 엔티티 barrel 을 값으로 부르지 않는다(첫 로드 번들)
  const assetClass =
    assetClassId === MarketAssetClass.KrStock ? MarketAssetClass.KrStock : MarketAssetClass.Crypto;
  const { data, isPending, isError, isSignedOut } = useWatchlist();
  const { data: overview } = useBoardOverview(assetClass, DEFAULT_MARKET_PARAMS);
  const starAssetType =
    assetClass === MarketAssetClass.KrStock ? WatchlistAssetType.KrStock : WatchlistAssetType.Crypto;

  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const { hrefOf: detailHref, open: openDetail } = useDetailLink();

  // 국내 주식 탭엔 국내 주식만, 코인 탭엔 그 밖 전부 — 코인 탭이 지금껏 보여 주던 행(옛 `stock` 포함)을 빼지 않는다
  const items = useMemo(
    () =>
      (data?.items ?? []).filter(
        (item) => (item.assetType === MarketAssetClass.KrStock) === (assetClass === MarketAssetClass.KrStock),
      ),
    [data?.items, assetClass],
  );
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

  /**
   * 프리뷰 주제를 고른다.
   *
   * 시세 목록에 있으면 그것을 쓴다 — 실시간 갱신이 그 쿼리로 들어오고 고가·저가까지
   * 같은 스냅샷이다. **없으면 관심 목록 항목으로 만든다.** 목록은 100위까지라
   * 그 밖의 종목과 주식은 여기로 떨어지고, 예전에는 패널이 빈 채로 남았다.
   */
  const previewSubject = useMemo(() => {
    if (!selectedSymbol) return undefined;

    const fromOverview = overview?.items.find(
      (item) => item.symbol === selectedSymbol,
    );
    if (fromOverview) return overviewItemToPreviewSubject(fromOverview);

    const fromWatchlist = bySymbol.get(selectedSymbol.toUpperCase());
    return fromWatchlist
      ? watchlistItemToPreviewSubject(fromWatchlist)
      : undefined;
  }, [bySymbol, overview?.items, selectedSymbol]);

  const renderAction = useCallback(
    (item: (typeof items)[number]) => (
      <WatchlistStarButton
        entry={item}
        displayName={item.name}
        request={{
          assetType: starAssetType,
          symbol: item.symbol,
          name: item.name,
        }}
      />
    ),
    [starAssetType],
  );

  if (isSignedOut) {
    return <StatusLine kind="blocked">{WATCHLIST_MESSAGES.signInRequired}</StatusLine>;
  }

  if (isPending) {
    // 문장 한 줄 대신 행 모양 스켈레톤 — 표가 들어올 자리를 미리 보인다 (FE-REQ-044 P-19)
    return (
      <div role="status" aria-busy="true" aria-label={WATCHLIST_MESSAGES.loading}>
        <Skeleton lines={8} height={40} radius="base" />
      </div>
    );
  }

  if (isError) {
    return <StatusLine kind="error">{WATCHLIST_MESSAGES.loadFailed}</StatusLine>;
  }

  // 0건은 빈 상태다. **더미를 만들지 않는다** (FR-33)
  if (items.length === 0) {
    return (
      <EmptyState
        iconFrame="none"
        icon={<StatusGraphic kind="empty" />}
        title={WATCHLIST_MESSAGES.emptyTitle}
        description={WATCHLIST_MESSAGES.emptyDescription}
      />
    );
  }

  return (
    <FlexBox justify="between" gap="2xl" className={splitLayout}>
      <div className={tablePane}>
        <WatchlistTable
          items={items}
          selectedSymbol={selectedSymbol}
          onSelect={openDetail}
          onPreview={setSelectedSymbol}
          detailHref={detailHref}
          renderAction={renderAction}
        />
      </div>
      <div className={previewPane}>
        {renderPreview ? (
          renderPreview(previewSubject)
        ) : (
          <MarketPreview subject={previewSubject} />
        )}
      </div>
    </FlexBox>
  );
};

export default WatchlistTab;

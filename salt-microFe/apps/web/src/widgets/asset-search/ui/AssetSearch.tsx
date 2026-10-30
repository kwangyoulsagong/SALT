"use client";

import { Chip } from "@repo/ui/chip";
import { FlexBox } from "@repo/ui/flexBox";
import { Skeleton } from "@repo/ui/skeleton";
import { Spinner } from "@repo/ui/spinner";
import { StatusLine } from "@repo/ui/statusLine";
import { Text } from "@repo/ui/text";
import { TextButton } from "@repo/ui/textButton";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AssetSearchItem,
  AssetSearchTable,
  indexWatchlistBySymbol,
  MarketAssetClass,
  SEARCH_MESSAGES,
  useAssetSearch,
  useWatchlist,
  WATCHLIST_ASSET_LABELS,
  WATCHLIST_MESSAGES,
  WatchlistAssetType,
} from "@/entities/market";
import { AssetSearchField, useAssetSearchQuery } from "@/features/search-asset";
import { WatchlistStarButton } from "@/features/toggle-watchlist";
import { ROUTES } from "@/shared/config";

import { counter, counterFull, field, header, list, section, srOnly } from "./AssetSearch.css";

/**
 * 종목 검색 (`FE-REQ-010` FR-70~78 · 103, `FE-REQ-011` FR-5~7 · 80~84). **전체 시장 목록이 아니라 추적 자산을 고르는 화면이다.**
 *
 * - 결과 · 카운터 · `isTracked` 는 서버 값이다. 별을 누르면 관심 목록과 검색을 같이 무효화해 맞춘다 — 낙관적으로 그리지 않는다
 *   (`useToggleWatchlist` 의 결정: 관심 행에 가격이 있다)
 * - ★ 의 제거 대상(id)은 관심 목록 쿼리에서 찾는다 — 시세 표 · 관심 종목 탭과 같은 쿼리(FR-6)
 * - 클라이언트 컴포넌트다 — 사용자별 `isTracked` 를 서버 렌더 캐시에 섞지 않는다(FR-84)
 */
export const AssetSearch = () => {
  const router = useRouter();
  const { input, setInput, setInputNow, query, recent, remember } = useAssetSearchQuery();
  // 자산군 칩(`FE-REQ-010` FR-77) — 검색어가 바뀌면 전체로 돌아간다. 칩은 **전체 결과에 실제로 있던 자산군만**
  const [filter, setFilter] = useState<{ query: string; assetType: MarketAssetClass } | null>(null);
  const assetType = filter?.query === query ? filter.assetType : undefined;
  const search = useAssetSearch(query, assetType);
  const [types, setTypes] = useState<{ query: string; list: string[] }>({ query: "", list: [] });
  const { data: watchlist, isPending: watchlistPending } = useWatchlist();
  const [limitNotice, setLimitNotice] = useState(false);

  const bySymbol = useMemo(() => indexWatchlistBySymbol(watchlist?.items ?? []), [watchlist?.items]);
  const tracked = search.data?.tracked ?? watchlist?.tracked ?? null;
  const items = search.data?.items ?? [];

  useEffect(() => {
    if (assetType || !search.data || search.isPlaceholderData) return;
    setTypes({ query, list: [...new Set(search.data.items.map((item) => item.assetType))] });
  }, [assetType, query, search.data, search.isPlaceholderData]);
  const shownTypes = types.query === query ? types.list.filter((type) => WATCHLIST_ASSET_LABELS[type]) : [];

  // 카운터가 상한 밑으로 내려오면(하나를 뺐다) 안내를 걷는다
  useEffect(() => {
    if (limitNotice && tracked && tracked.count < tracked.limit) setLimitNotice(false);
  }, [limitNotice, tracked]);

  const open = useCallback(
    (item: AssetSearchItem) => {
      remember();
      router.push(ROUTES.investmentDetail(item.symbol));
    },
    [remember, router],
  );
  const showLimit = useCallback(() => setLimitNotice(true), []);
  /** 별이 기대는 관심 목록 id — 바뀌면 그 행을 다시 그린다(`AssetSearchTable` `actionKey`) */
  const actionKey = useCallback((item: AssetSearchItem) => bySymbol.get(item.symbol.toUpperCase())?.id ?? "", [bySymbol]);

  const renderAction = useCallback(
    (item: AssetSearchItem) => (
      <WatchlistStarButton
        entry={bySymbol.get(item.symbol.toUpperCase())}
        displayName={item.name}
        held={item.isHeld}
        onTrackedLimit={showLimit}
        request={{
          assetType: item.assetType === MarketAssetClass.KrStock ? WatchlistAssetType.KrStock : WatchlistAssetType.Crypto,
          symbol: item.symbol,
          name: item.name,
        }}
      />
    ),
    [bySymbol, showLimit],
  );

  if (search.isSignedOut) {
    return <StatusLine kind="blocked">{SEARCH_MESSAGES.signInRequired}</StatusLine>;
  }

  const full = tracked !== null && tracked.count >= tracked.limit;

  return (
    <FlexBox direction="column" gap="lg" className={section}>
      <div className={header}>
        <AssetSearchField value={input} onChange={setInput} onCommit={setInputNow} className={field} />
        {/* 두 번째 요청부터는 이전 결과를 두고 여기서만 돈다(FR-103) */}
        {search.isFetching && search.isPlaceholderData ? (
          <Spinner size="sm" tone="neutral" label={SEARCH_MESSAGES.searching} />
        ) : null}
        {tracked ? (
          <span className={full ? counterFull : counter} title={WATCHLIST_MESSAGES.trackedCounterTitle}>
            {WATCHLIST_MESSAGES.trackedCounter(tracked.count, tracked.limit)}
          </span>
        ) : null}
      </div>

      {limitNotice ? (
        <StatusLine kind="blocked" live>
          {WATCHLIST_MESSAGES.trackedLimitReached}
        </StatusLine>
      ) : null}

      {query === "" && recent.length > 0 ? (
        <FlexBox direction="column" gap="sm">
          <Text variant="caption" color="tertiary">
            {SEARCH_MESSAGES.recentHeading}
          </Text>
          <FlexBox gap="sm" wrap="wrap">
            {recent.map((value) => (
              <Chip key={value} size="sm" onPress={() => setInputNow(value)}>
                {value}
              </Chip>
            ))}
          </FlexBox>
        </FlexBox>
      ) : null}

      {query !== "" && shownTypes.length > 1 ? (
        <div role="group" aria-label={SEARCH_MESSAGES.filterGroupLabel}>
          <FlexBox gap="sm" wrap="wrap">
            <Chip size="sm" selected={!assetType} onPress={() => setFilter(null)}>
              {SEARCH_MESSAGES.filterAll}
            </Chip>
            {shownTypes.map((type) => (
              <Chip
                key={type}
                size="sm"
                selected={assetType === type}
                onPress={() => setFilter({ query, assetType: type as MarketAssetClass })}
              >
                {WATCHLIST_ASSET_LABELS[type]}
              </Chip>
            ))}
          </FlexBox>
        </div>
      ) : null}

      <FlexBox direction="column" gap="sm" className={list}>
        <Text variant="caption" color="tertiary">
          {query === "" ? SEARCH_MESSAGES.trackedHeading : SEARCH_MESSAGES.resultHeading}
        </Text>
        {/* 결과 수를 한 번 알린다 — 타이핑마다가 아니라 확정된 검색어의 결과가 바뀔 때만(FR-78) */}
        <p aria-live="polite" className={srOnly}>
          {search.data && !search.isPlaceholderData ? SEARCH_MESSAGES.resultCount(items.length) : ""}
        </p>
        <SearchBody
          // ★ 의 제거 대상(id)은 관심 목록에서 온다 — 검색이 먼저 와도 둘 다 올 때까지 기다린다. 아니면 담긴 종목이 잠깐 빈 별로 보인다
          isPending={search.isPending || watchlistPending}
          isError={search.isError && !search.data}
          onRetry={() => void search.refetch()}
          query={query}
          items={items}
          onSelect={open}
          renderAction={renderAction}
          actionKey={actionKey}
        />
      </FlexBox>
    </FlexBox>
  );
};

/** 상태 표(`FE-REQ-010` FR-103): 첫 요청만 스켈레톤 · 이후는 이전 결과 유지 · 실패는 다시 시도 · 0건은 한 줄 */
const SearchBody = ({
  isPending,
  isError,
  onRetry,
  query,
  items,
  onSelect,
  renderAction,
  actionKey,
}: {
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  query: string;
  items: AssetSearchItem[];
  onSelect: (item: AssetSearchItem) => void;
  renderAction: (item: AssetSearchItem) => React.ReactNode;
  actionKey: (item: AssetSearchItem) => string;
}) => {
  if (isPending) {
    return (
      <div role="status" aria-busy="true" aria-label={SEARCH_MESSAGES.loading}>
        <Skeleton lines={3} height={40} radius="base" />
      </div>
    );
  }
  if (isError) {
    return (
      <FlexBox align="center" gap="md">
        <StatusLine kind="error">{SEARCH_MESSAGES.failed}</StatusLine>
        <TextButton onClick={onRetry}>{SEARCH_MESSAGES.retry}</TextButton>
      </FlexBox>
    );
  }
  if (items.length === 0) {
    return (
      <StatusLine kind="empty">{query === "" ? SEARCH_MESSAGES.trackedEmpty : SEARCH_MESSAGES.empty(query)}</StatusLine>
    );
  }
  return (
    <AssetSearchTable
      items={items}
      onSelect={onSelect}
      detailHref={ROUTES.investmentDetail}
      renderAction={renderAction}
      actionKey={actionKey}
    />
  );
};

export default AssetSearch;

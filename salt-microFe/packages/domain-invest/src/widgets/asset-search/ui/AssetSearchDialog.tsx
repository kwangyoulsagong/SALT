"use client";

import {
  availableSearchTabs as availableTabs,
  effectiveSearchTab as effectiveTab,
  escapeStep,
  SearchResultTab as ResultTab,
  visibleSearchResults as visibleResults,
} from "@repo/core/search";
import { Chip } from "@repo/ui/chip";
import { Modal } from "@repo/ui/modal";
import { Skeleton } from "@repo/ui/skeleton";
import { Spinner } from "@repo/ui/spinner";
import { StatusLine } from "@repo/ui/statusLine";
import { TextButton } from "@repo/ui/textButton";
import { X } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import {
  type AssetSearchItem,
  indexWatchlistBySymbol,
  KR_STOCK_MESSAGES,
  MarketAssetClass,
  type MarketOverviewItem,
  type NewsArticleView,
  type RisingSectors,
  SEARCH_EXTRA_MESSAGES,
  SEARCH_MESSAGES,
  SearchOption,
  searchNewsToView,
  SearchTextOption,
  type TopTradeValueGroup,
  useAssetSearch,
  useRisingSectors,
  useSearchGroups,
  useTopTradeValue,
  useWatchlist,
  WATCHLIST_ASSET_LABELS,
  WATCHLIST_MESSAGES,
  WatchlistAssetType,
} from "@/entities/market";
import { AssetSearchField, useAssetSearchQuery, useSearchListKeys } from "@/features/search-asset";
import { WatchlistStarButton } from "@/features/toggle-watchlist";
import { ROUTES } from "@repo/web-shared/config";
import { formatClockTime, formatRelativeTime, useDebouncedValue } from "@repo/web-shared/lib";
import { Tabs } from "@repo/ui/tabs";

import { EntryKind, type ResultEntry, resultEntries, type VisibleResults } from "../lib/searchEntries";
import * as styles from "./AssetSearchDialog.css";
import { SearchSidePanel } from "./SearchSidePanel";

/** 업종 · 지수 줄이 가는 곳 — 국내 시세 표(투자 화면 국내 탭). 업종 · 지수 상세 화면은 없다(사용자 2026-11-10) */
const KR_BOARD_HREF = ROUTES.investmentsKr;
/** 곁 칸 — ↑↓ 로 줄을 훑는 동안 줄마다 묻지 않게 잠깐 머문 줄만 묻는다 */
const SIDE_SETTLE_MS = 150;
const kindLabel = (kind: "news" | "disclosure") => KR_STOCK_MESSAGES.news.kind[kind];

export interface AssetSearchDialogProps {
  open: boolean;
  /** 고르지 않고 닫는다(Esc 두 번째 · 바깥 누름) */
  onDismiss: () => void;
  /** 행을 골랐다 — 닫고 상세로 가는 것은 부르는 쪽(주소가 `/search` 인지 안다) */
  onNavigate: (href: string) => void;
  /** `/search` 주소로 연 모달만 `?q=` 를 읽고 쓴다(`FE-REQ-066` FR-5 · D5) */
  syncUrl: boolean;
  /** 뉴스 줄을 골랐다 — 검색 모달을 닫고 뉴스 모달을 연다(부르는 쪽이 쥔다 — 모달 둘이 겹치지 않게, `FE-REQ-066` FR-8) */
  onOpenNews: (article: NewsArticleView, more: NewsArticleView[]) => void;
}

/** 키보드가 고르는 한 행 — 첫 화면 순위와 결과가 같은 모양으로 줄 선다 */
interface OptionEntry {
  key: string;
  href: string;
  /** 최근 검색에 남길 말 — 순위 행은 검색어가 없어 남기지 않는다 */
  remember: boolean;
}

const rankEntries = (group: TopTradeValueGroup | null, prefix: string): OptionEntry[] =>
  group?.items.map((item) => ({ key: `${prefix}:${item.symbol}`, href: ROUTES.investmentDetail(item.symbol), remember: false })) ?? [];

const risingEntries = (rising: RisingSectors | undefined): OptionEntry[] =>
  rising?.items.map((sector) => ({ key: `rising:${sector.code}`, href: KR_BOARD_HREF, remember: false })) ?? [];

/**
 * 종목 검색 모달 (`FE-REQ-066` 1단계 — 화면 틀이 바뀌고 결과 · 추적(★) 은 서버 값 그대로 — 게스트는 ★ 칸이 null(`FE-REQ-070`), `FE-REQ-010` · `011`).
 *
 * - 첫 화면: 최근 검색 칩(칩마다 × · 기기 저장) → 거래대금 상위(코인 · 국내, D3 라벨)
 * - 입력 중: 결과 행(로고 · 하이라이트 · 코드 · 현재가 · 등락률 · ★) + 자산군 칩(결과에 실제로 있는 것만, `FE-REQ-010` FR-77)
 * - 키보드: 포커스는 검색칸 고정 · ↑↓ 고른 행(`aria-activedescendant`) · Enter 상세 · Esc 두 단계(지우기 → 닫기)
 * - 주소: 바뀌지 않는다(`syncUrl` 이 아니면) — 열고 닫아도 그 화면 그대로
 * - 클라이언트 컴포넌트다 — 사용자별 `isTracked` 를 서버 렌더 캐시에 섞지 않는다(`FE-REQ-011` FR-84)
 */
export const AssetSearchDialog = ({ open, onDismiss, onNavigate, syncUrl, onOpenNews }: AssetSearchDialogProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  // Esc 두 단계(FR-5)는 포커스가 어디 있든(검색칸 · ★ · 칩) 같다 — 모달의 Esc 한 곳에서 본문이 정한 다음 단계를 부른다
  const escapeRef = useRef<(() => void) | null>(null);
  const onEscape = useCallback(() => (escapeRef.current ?? onDismiss)(), [onDismiss]);
  return (
    <Modal
      open={open}
      onClose={onDismiss}
      onEscape={onEscape}
      size="search"
      hideCloseButton
      label={SEARCH_MESSAGES.dialogLabel}
      initialFocusRef={inputRef}
    >
      {/* 열릴 때마다 새로 — 지난 검색어 · 고른 행이 남지 않는다 */}
      {open ? (
        <SearchBody
          inputRef={inputRef}
          escapeRef={escapeRef}
          onDismiss={onDismiss}
          onNavigate={onNavigate}
          syncUrl={syncUrl}
          onOpenNews={onOpenNews}
        />
      ) : null}
    </Modal>
  );
};

const SearchBody = ({
  inputRef,
  escapeRef,
  onDismiss,
  onNavigate,
  syncUrl,
  onOpenNews,
}: Omit<AssetSearchDialogProps, "open"> & {
  inputRef: React.RefObject<HTMLInputElement>;
  escapeRef: React.MutableRefObject<(() => void) | null>;
}) => {
  const listId = useId();
  const { input, setInput, setInputNow, query, recent, remember, forget } = useAssetSearchQuery({ syncUrl });
  // 자산군 칩(`FE-REQ-010` FR-77) — 검색어가 바뀌면 전체로 돌아간다
  const [filter, setFilter] = useState<{ query: string; assetType: MarketAssetClass } | null>(null);
  const assetType = filter?.query === query ? filter.assetType : undefined;
  const search = useAssetSearch(query, assetType);
  const [types, setTypes] = useState<{ query: string; list: string[] }>({ query: "", list: [] });
  const { data: watchlist, isPending: watchlistLoading, isSignedOut: watchlistSignedOut } = useWatchlist();
  // 게스트는 관심 목록 조회가 꺼져 있다 — 꺼진 조회는 `isPending` 이 계속 참이라 기다리면 결과가 영영 안 뜬다(2026-11-10 실화면, `FE-REQ-070`)
  const watchlistPending = watchlistLoading && !watchlistSignedOut;
  const [limitNotice, setLimitNotice] = useState(false);
  const top = useTopTradeValue(query === "");
  const rising = useRisingSectors(query === "");
  const groups = useSearchGroups(query);
  const groupData = query === "" ? undefined : groups.data;
  // 결과 탭(FR-8) — 검색어가 바뀌면 전체로. 고른 탭의 묶음이 비면 전체로
  const [tabState, setTabState] = useState<{ query: string; tab: ResultTab }>({ query: "", tab: ResultTab.All });
  const tabs = useMemo(() => availableTabs(groupData), [groupData]);
  const tab = effectiveTab(tabState.query === query ? tabState.tab : ResultTab.All, tabs);

  const bySymbol = useMemo(() => indexWatchlistBySymbol(watchlist?.items ?? []), [watchlist?.items]);
  const tracked = search.data?.tracked ?? watchlist?.tracked ?? null;
  const results = useMemo(() => (query === "" ? [] : (search.data?.items ?? [])), [query, search.data]);

  useEffect(() => {
    if (assetType || !search.data || search.isPlaceholderData) return;
    setTypes({ query, list: [...new Set(search.data.items.map((item) => item.assetType))] });
  }, [assetType, query, search.data, search.isPlaceholderData]);
  const shownTypes = types.query === query ? types.list.filter((type) => WATCHLIST_ASSET_LABELS[type]) : [];

  // 카운터가 상한 밑으로 내려오면(하나를 뺐다) 안내를 걷는다
  useEffect(() => {
    if (limitNotice && tracked && tracked.count < tracked.limit) setLimitNotice(false);
  }, [limitNotice, tracked]);

  const visible = useMemo(() => visibleResults(tab, results, groupData), [tab, results, groupData]);
  const resultRows = useMemo<ResultEntry[]>(
    () => resultEntries(visible, { detail: ROUTES.investmentDetail, krBoard: KR_BOARD_HREF }),
    [visible],
  );
  const entries = useMemo<OptionEntry[]>(
    () =>
      query === ""
        ? [...rankEntries(top.crypto, "crypto"), ...rankEntries(top.kr, "kr"), ...risingEntries(rising.data)]
        : resultRows.map((entry) => ({ key: entry.key, href: entry.href ?? "", remember: true })),
    [query, resultRows, top.crypto, top.kr, rising.data],
  );
  const optionId = useCallback((index: number) => `${listId}-${index}`, [listId]);

  const newsViews = useMemo(() => (groupData?.news ?? []).map((n) => searchNewsToView(n, kindLabel)), [groupData]);

  const openEntry = useCallback(
    (index: number) => {
      const entry = entries[index];
      if (!entry) return;
      if (entry.remember) remember(input);
      const result = query === "" ? undefined : resultRows[index];
      if (result?.kind === EntryKind.News) {
        const article = newsViews.find((view) => view.id === result.newsId);
        if (article) onOpenNews(article, newsViews.filter((view) => view.id !== article.id));
        return;
      }
      onNavigate(entry.href);
    },
    [entries, input, newsViews, onNavigate, onOpenNews, query, remember, resultRows],
  );

  const keys = useSearchListKeys({
    count: entries.length,
    resetKey: `${query}|${assetType ?? ""}|${tab}|${entries.length}`,
    onOpen: openEntry,
  });

  // 곁 칸 대상 — 고른 줄이 종목 · 업종일 때만. 잠깐 머문 줄만 묻는다
  const activeResult = query === "" ? undefined : resultRows[keys.activeIndex];
  const sideTarget = useDebouncedValue(activeResult?.side ?? null, SIDE_SETTLE_MS);
  const sideIsSector = sideTarget !== null && "sector" in sideTarget;
  const selectTab = (next: string) => {
    setTabState({ query, tab: next as ResultTab });
    inputRef.current?.focus();
  };

  // Esc 두 단계(FR-5) — 글자가 있으면 지우고 검색칸으로, 비면 닫는다. 모달이 부른다(위)
  useEffect(() => {
    escapeRef.current = () => {
      if (escapeStep(input) === "close") return onDismiss();
      setInputNow("");
      inputRef.current?.focus();
    };
    return () => {
      escapeRef.current = null;
    };
  }, [escapeRef, input, inputRef, onDismiss, setInputNow]);

  const showLimit = useCallback(() => setLimitNotice(true), []);
  const renderAction = (item: AssetSearchItem) => (
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
  );

  const full = tracked !== null && tracked.count >= tracked.limit;
  const optionProps = (index: number) => ({
    id: optionId(index),
    active: keys.activeIndex === index,
    href: entries[index]?.href ?? "",
    onSelect: () => openEntry(index),
    onHover: () => keys.setActiveIndex(index),
  });

  return (
    <>
      <div className={styles.top}>
        <AssetSearchField
          ref={inputRef}
          className={styles.field}
          value={input}
          onChange={setInput}
          onCommit={setInputNow}
          onKeyDown={keys.onKeyDown}
          listId={listId}
          activeOptionId={keys.activeIndex >= 0 ? optionId(keys.activeIndex) : undefined}
          expanded={entries.length > 0}
          popup={query === "" ? "listbox" : "grid"}
        />
        {/* 두 번째 요청부터는 이전 결과를 두고 여기서만 돈다(`FE-REQ-010` FR-103) */}
        {search.isFetching && search.isPlaceholderData && query !== "" ? (
          <Spinner size="sm" tone="neutral" label={SEARCH_MESSAGES.searching} />
        ) : null}
        {tracked ? (
          <span className={full ? styles.counterFull : styles.counter} title={WATCHLIST_MESSAGES.trackedCounterTitle}>
            {WATCHLIST_MESSAGES.trackedCounter(tracked.count, tracked.limit)}
          </span>
        ) : null}
      </div>

      {query !== "" && tabs.length > 1 ? (
        <div className={styles.tabs}>
          <Tabs
            tabs={tabs.map((id) => ({ id, label: SEARCH_EXTRA_MESSAGES.tabs[id] }))}
            activeTab={tab}
            onTabChange={selectTab}
          />
        </div>
      ) : null}

      <div className={styles.split}>
      {/* 본문만 스크롤 — 키보드로도 굴릴 수 있게 칸이 포커스를 받는다(axe scrollable-region-focusable) */}
      <div className={styles.body} tabIndex={0} aria-label={SEARCH_MESSAGES.dialogLabel}>

        {limitNotice ? (
          <StatusLine kind="blocked" live>
            {WATCHLIST_MESSAGES.trackedLimitReached}
          </StatusLine>
        ) : null}

        {query === "" && recent.length > 0 ? (
          <section aria-labelledby={`${listId}-recent`}>
            <h2 id={`${listId}-recent`} className={styles.sectionHead}>
              {SEARCH_MESSAGES.recentHeading}
            </h2>
            <div className={styles.chips}>
              {recent.map((value) => (
                <span key={value} className={styles.chip}>
                  <button type="button" className={styles.chipText} onClick={() => setInputNow(value)}>
                    {value}
                  </button>
                  <button
                    type="button"
                    className={styles.chipRemove}
                    aria-label={SEARCH_MESSAGES.removeRecent(value)}
                    onClick={() => forget(value)}
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {query !== "" && (tab === ResultTab.All || tab === ResultTab.Assets) && shownTypes.length > 1 ? (
          <div role="group" aria-label={SEARCH_MESSAGES.filterGroupLabel} className={styles.chips}>
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
          </div>
        ) : null}

        {query === "" ? (
          <TopTradeValue
            listId={listId}
            crypto={top.crypto}
            kr={top.kr}
            rising={rising.data}
            isPending={top.isPending}
            optionProps={optionProps}
          />
        ) : (
          <Results
            listId={listId}
            query={query}
            visible={visible}
            isPending={search.isPending || watchlistPending}
            isError={search.isError && !search.data}
            onRetry={() => void search.refetch()}
            onMoreAssets={() => selectTab(ResultTab.Assets)}
            optionProps={optionProps}
            renderAction={renderAction}
          />
        )}

        {/* 결과 수를 한 번 알린다 — 타이핑마다가 아니라 확정된 검색어의 결과가 바뀔 때만(FR-6 · `FE-REQ-010` FR-78) */}
        <p aria-live="polite" className={styles.srOnly}>
          {query !== "" && search.data && !search.isPlaceholderData ? SEARCH_EXTRA_MESSAGES.resultCount(entries.length) : ""}
        </p>
      </div>
      {query !== "" ? <SearchSidePanel
          target={sideTarget}
          isSector={sideIsSector}
          hasSelection={keys.activeIndex >= 0}
          onNavigate={onNavigate}
        /> : null}
      </div>

      <div className={styles.footer} aria-hidden="true">
        <span className={styles.footerItem}>
          <kbd className={styles.keyChip}>{SEARCH_MESSAGES.keys.enter}</kbd>
          {SEARCH_MESSAGES.footer.enter}
        </span>
        <span className={styles.footerItem}>
          <kbd className={styles.keyChip}>{SEARCH_MESSAGES.keys.escape}</kbd>
          {SEARCH_MESSAGES.footer.escape}
        </span>
        <span className={styles.footerItem}>
          <kbd className={styles.keyChip}>{SEARCH_MESSAGES.keys.arrows}</kbd>
          {SEARCH_MESSAGES.footer.arrows}
        </span>
      </div>
    </>
  );
};

type OptionPropsOf = (index: number) => {
  id: string;
  active: boolean;
  href: string;
  onSelect: () => void;
  onHover: () => void;
};

/** 첫 화면 순위 — 코인 · 국내 두 묶음이 한 목록(키보드는 이어서 내려간다). 국내 묶음은 국내 키가 켜져 있을 때 온다 */
const TopTradeValue = ({
  listId,
  crypto,
  kr,
  rising,
  isPending,
  optionProps,
}: {
  listId: string;
  crypto: TopTradeValueGroup | null;
  kr: TopTradeValueGroup | null;
  /** 지금 뜨는 업종(FR-8) — 국내 키가 켜져 있을 때 온다. 같은 목록에 이어 둬 ↑↓ 가 끝까지 내려간다 */
  rising: RisingSectors | undefined;
  isPending: boolean;
  optionProps: OptionPropsOf;
}) => {
  if (isPending && !crypto && !kr) {
    return (
      <div role="status" aria-busy="true" aria-label={SEARCH_MESSAGES.loading}>
        <Skeleton lines={5} height={44} radius="base" />
      </div>
    );
  }
  if (!crypto && !kr && !rising?.items.length) return null;
  const groups = [
    { id: "crypto", label: SEARCH_MESSAGES.topCrypto, group: crypto, offset: 0 },
    { id: "kr", label: SEARCH_MESSAGES.topKr, group: kr, offset: crypto?.items.length ?? 0 },
  ];
  const risingOffset = (crypto?.items.length ?? 0) + (kr?.items.length ?? 0);
  return (
    <section aria-labelledby={`${listId}-top`}>
      <h2 id={`${listId}-top`} className={styles.sectionHead}>
        {SEARCH_MESSAGES.topHeading}
      </h2>
      <div id={listId} role="listbox" aria-labelledby={`${listId}-top`} className={styles.list}>
        {groups.map(({ id, label, group, offset }) =>
          group ? (
            <ul key={id} role="group" aria-labelledby={`${listId}-${id}`} className={styles.group}>
              <li role="presentation" id={`${listId}-${id}`} className={styles.sectionHead}>
                <span>{label}</span>
                {group.asOf ? (
                  <span className={styles.sectionMeta}>{SEARCH_MESSAGES.asOf(formatClockTime(new Date(group.asOf)))}</span>
                ) : null}
              </li>
              {group.items.map((item: MarketOverviewItem, index) => (
                <SearchOption
                  key={item.symbol}
                  {...optionProps(offset + index)}
                  assetType={item.kr ? MarketAssetClass.KrStock : MarketAssetClass.Crypto}
                  symbol={item.symbol}
                  name={item.koreanName || item.symbol}
                  logoUrl={item.logoUrl || null}
                  rank={index + 1}
                  changeRate={Number.isFinite(item.change24h) ? item.change24h : null}
                />
              ))}
            </ul>
          ) : null,
        )}
        {rising && rising.items.length > 0 ? (
          <ul role="group" aria-labelledby={`${listId}-rising`} className={styles.group}>
            <li role="presentation" id={`${listId}-rising`} className={styles.sectionHead}>
              <span>{SEARCH_EXTRA_MESSAGES.risingHeading}</span>
              <span className={styles.sectionMeta}>
                {rising.asOf
                  ? `${SEARCH_EXTRA_MESSAGES.risingHint} · ${SEARCH_MESSAGES.asOf(formatClockTime(new Date(rising.asOf)))}`
                  : SEARCH_EXTRA_MESSAGES.risingHint}
              </span>
            </li>
            {rising.items.map((sector, index) => (
              <SearchTextOption
                key={sector.code}
                {...optionProps(risingOffset + index)}
                title={sector.name}
                rank={index + 1}
                changeRate={sector.changeRate}
              />
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
};

/**
 * 입력 중 — 첫 요청만 스켈레톤 · 이후는 이전 결과 유지 · 실패는 다시 시도 · 0건은 문구 + 한 줄(`FE-REQ-010` FR-103).
 * 묶음(FR-8): 종목 → 업종 → 뉴스 → 지수. 한 격자 안 줄 묶음(`rowgroup`) — 종목 줄은 ★ 칸이 있어 격자다(선택지 안 단추 금지)
 */
const Results = ({
  listId,
  query,
  visible,
  isPending,
  isError,
  onRetry,
  onMoreAssets,
  optionProps,
  renderAction,
}: {
  listId: string;
  query: string;
  visible: VisibleResults;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  onMoreAssets: () => void;
  optionProps: OptionPropsOf;
  renderAction: (item: AssetSearchItem) => React.ReactNode;
}) => {
  if (isPending) {
    return (
      <div role="status" aria-busy="true" aria-label={SEARCH_MESSAGES.loading}>
        <Skeleton lines={3} height={54} radius="base" />
      </div>
    );
  }
  const total = visible.assets.length + visible.sectors.length + visible.news.length + visible.indices.length;
  if (isError && total === 0) {
    return (
      <div className={styles.empty}>
        <StatusLine kind="error">{SEARCH_MESSAGES.failed}</StatusLine>
        <TextButton onClick={onRetry}>{SEARCH_MESSAGES.retry}</TextButton>
      </div>
    );
  }
  if (total === 0) {
    return (
      <div className={styles.empty}>
        <StatusLine kind="empty">{SEARCH_MESSAGES.empty(query)}</StatusLine>
        <span className={styles.counter}>{SEARCH_MESSAGES.emptyHint}</span>
      </div>
    );
  }
  const sectorStart = visible.assets.length;
  const newsStart = sectorStart + visible.sectors.length;
  const indexStart = newsStart + visible.news.length;
  const groupHead = (id: string, label: string) => (
    <div role="row" className={styles.groupHeadRow}>
      <span role="columnheader" id={id} className={styles.groupHead}>
        {label}
      </span>
    </div>
  );
  return (
    <section aria-labelledby={`${listId}-results`}>
      <h2 id={`${listId}-results`} className={styles.srOnly}>
        {SEARCH_MESSAGES.resultHeading}
      </h2>
      <div id={listId} role="grid" aria-labelledby={`${listId}-results`} className={styles.list}>
        {visible.assets.length > 0 ? (
          <div role="rowgroup" aria-labelledby={`${listId}-g-assets`} className={styles.group}>
            {groupHead(`${listId}-g-assets`, SEARCH_EXTRA_MESSAGES.tabs.assets)}
            {visible.assets.map((item, index) => (
              <SearchOption
                key={`${item.assetType}:${item.symbol}`}
                {...optionProps(index)}
                assetType={item.assetType}
                symbol={item.symbol}
                name={item.name}
                logoUrl={item.logoUrl}
                highlight={query}
                currentPrice={item.currentPrice}
                changeRate={item.changeRate}
                held={item.isHeld}
                action={renderAction(item)}
              />
            ))}
          </div>
        ) : null}
        {visible.sectors.length > 0 ? (
          <div role="rowgroup" aria-labelledby={`${listId}-g-sectors`} className={styles.group}>
            {groupHead(`${listId}-g-sectors`, SEARCH_EXTRA_MESSAGES.tabs.sectors)}
            {visible.sectors.map((sector, index) => (
              <SearchTextOption
                key={sector.code}
                {...optionProps(sectorStart + index)}
                inGrid
                title={sector.name}
                highlight={query}
                meta={SEARCH_EXTRA_MESSAGES.sectorMeta}
                changeRate={sector.changeRate}
              />
            ))}
          </div>
        ) : null}
        {visible.news.length > 0 ? (
          <div role="rowgroup" aria-labelledby={`${listId}-g-news`} className={styles.group}>
            {groupHead(`${listId}-g-news`, SEARCH_EXTRA_MESSAGES.tabs.news)}
            {visible.news.map((news, index) => (
              <SearchTextOption
                key={`${news.market}:${news.id}`}
                {...optionProps(newsStart + index)}
                inGrid
                title={news.title}
                highlight={query}
                meta={SEARCH_EXTRA_MESSAGES.newsMeta(news.source, formatRelativeTime(news.publishedAt))}
              />
            ))}
          </div>
        ) : null}
        {visible.indices.length > 0 ? (
          <div role="rowgroup" aria-labelledby={`${listId}-g-indices`} className={styles.group}>
            {groupHead(`${listId}-g-indices`, SEARCH_EXTRA_MESSAGES.tabs.indices)}
            {visible.indices.map((index, i) => (
              <SearchTextOption
                key={index.code}
                {...optionProps(indexStart + i)}
                inGrid
                title={index.name}
                highlight={query}
                meta={SEARCH_EXTRA_MESSAGES.indexMeta(index.value.toLocaleString("ko-KR", { maximumFractionDigits: 2 }))}
                changeRate={index.changeRate}
              />
            ))}
          </div>
        ) : null}
      </div>
      {visible.moreAssets ? (
        <TextButton className={styles.more} onClick={onMoreAssets}>
          {SEARCH_EXTRA_MESSAGES.moreAssets}
        </TextButton>
      ) : null}
    </section>
  );
};

export default AssetSearchDialog;

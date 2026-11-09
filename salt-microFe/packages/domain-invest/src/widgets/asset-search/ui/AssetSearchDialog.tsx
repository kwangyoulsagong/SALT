"use client";

import { escapeStep } from "@repo/core/search";
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
  MarketAssetClass,
  type MarketOverviewItem,
  SEARCH_MESSAGES,
  SearchOption,
  type TopTradeValueGroup,
  useAssetSearch,
  useTopTradeValue,
  useWatchlist,
  WATCHLIST_ASSET_LABELS,
  WATCHLIST_MESSAGES,
  WatchlistAssetType,
} from "@/entities/market";
import { AssetSearchField, useAssetSearchQuery, useSearchListKeys } from "@/features/search-asset";
import { WatchlistStarButton } from "@/features/toggle-watchlist";
import { ROUTES } from "@repo/web-shared/config";
import { formatClockTime } from "@repo/web-shared/lib";

import * as styles from "./AssetSearchDialog.css";

export interface AssetSearchDialogProps {
  open: boolean;
  /** 고르지 않고 닫는다(Esc 두 번째 · 바깥 누름) */
  onDismiss: () => void;
  /** 행을 골랐다 — 닫고 상세로 가는 것은 부르는 쪽(주소가 `/search` 인지 안다) */
  onNavigate: (href: string) => void;
  /** `/search` 주소로 연 모달만 `?q=` 를 읽고 쓴다(`FE-REQ-066` FR-5 · D5) */
  syncUrl: boolean;
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

/**
 * 종목 검색 모달 (`FE-REQ-066` 1단계 — 화면 틀이 바뀌고 결과 · 추적(★) · 소유자 판정은 서버 값 그대로, `FE-REQ-010` · `011`).
 *
 * - 첫 화면: 최근 검색 칩(칩마다 × · 기기 저장) → 거래대금 상위(코인 · 국내 — 국내는 소유자만, D3 라벨)
 * - 입력 중: 결과 행(로고 · 하이라이트 · 코드 · 현재가 · 등락률 · ★) + 자산군 칩(결과에 실제로 있는 것만, `FE-REQ-010` FR-77)
 * - 키보드: 포커스는 검색칸 고정 · ↑↓ 고른 행(`aria-activedescendant`) · Enter 상세 · Esc 두 단계(지우기 → 닫기)
 * - 주소: 바뀌지 않는다(`syncUrl` 이 아니면) — 열고 닫아도 그 화면 그대로
 * - 클라이언트 컴포넌트다 — 사용자별 `isTracked` 를 서버 렌더 캐시에 섞지 않는다(`FE-REQ-011` FR-84)
 */
export const AssetSearchDialog = ({ open, onDismiss, onNavigate, syncUrl }: AssetSearchDialogProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <Modal
      open={open}
      onClose={onDismiss}
      size="search"
      hideCloseButton
      label={SEARCH_MESSAGES.dialogLabel}
      initialFocusRef={inputRef}
    >
      {/* 열릴 때마다 새로 — 지난 검색어 · 고른 행이 남지 않는다 */}
      {open ? <SearchBody inputRef={inputRef} onDismiss={onDismiss} onNavigate={onNavigate} syncUrl={syncUrl} /> : null}
    </Modal>
  );
};

const SearchBody = ({
  inputRef,
  onDismiss,
  onNavigate,
  syncUrl,
}: Omit<AssetSearchDialogProps, "open"> & { inputRef: React.RefObject<HTMLInputElement> }) => {
  const listId = useId();
  const { input, setInput, setInputNow, query, recent, remember, forget } = useAssetSearchQuery({ syncUrl });
  // 자산군 칩(`FE-REQ-010` FR-77) — 검색어가 바뀌면 전체로 돌아간다
  const [filter, setFilter] = useState<{ query: string; assetType: MarketAssetClass } | null>(null);
  const assetType = filter?.query === query ? filter.assetType : undefined;
  const search = useAssetSearch(query, assetType);
  const [types, setTypes] = useState<{ query: string; list: string[] }>({ query: "", list: [] });
  const { data: watchlist, isPending: watchlistPending } = useWatchlist();
  const [limitNotice, setLimitNotice] = useState(false);
  const top = useTopTradeValue(query === "");

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

  const entries = useMemo<OptionEntry[]>(
    () =>
      query === ""
        ? [...rankEntries(top.crypto, "crypto"), ...rankEntries(top.kr, "kr")]
        : results.map((item) => ({
            key: `${item.assetType}:${item.symbol}`,
            href: ROUTES.investmentDetail(item.symbol),
            remember: true,
          })),
    [query, results, top.crypto, top.kr],
  );
  const optionId = useCallback((index: number) => `${listId}-${index}`, [listId]);

  const openEntry = useCallback(
    (entry: OptionEntry | undefined) => {
      if (!entry) return;
      if (entry.remember) remember(input);
      onNavigate(entry.href);
    },
    [input, onNavigate, remember],
  );

  const keys = useSearchListKeys({
    count: entries.length,
    resetKey: `${query}|${assetType ?? ""}|${entries.length}`,
    onOpen: (index) => openEntry(entries[index]),
  });

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // Esc 두 단계(FR-5) — 모달의 Esc 보다 먼저: 글자가 있으면 지우기만
    if (event.key === "Escape" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.stopPropagation();
      event.nativeEvent.stopImmediatePropagation();
      if (escapeStep(input) === "clear") setInputNow("");
      else onDismiss();
      return;
    }
    keys.onKeyDown(event);
  };

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
    onSelect: () => openEntry(entries[index]),
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
          onKeyDown={onKeyDown}
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

      {/* 본문만 스크롤 — 키보드로도 굴릴 수 있게 칸이 포커스를 받는다(axe scrollable-region-focusable) */}
      <div className={styles.body} tabIndex={0} aria-label={SEARCH_MESSAGES.dialogLabel}>
        {search.isSignedOut ? <StatusLine kind="blocked">{SEARCH_MESSAGES.signInRequired}</StatusLine> : null}

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

        {query !== "" && shownTypes.length > 1 ? (
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
            isPending={top.isPending}
            optionProps={optionProps}
          />
        ) : (
          <Results
            listId={listId}
            query={query}
            items={results}
            isPending={search.isPending || watchlistPending}
            isError={search.isError && !search.data}
            onRetry={() => void search.refetch()}
            optionProps={optionProps}
            renderAction={renderAction}
          />
        )}

        {/* 결과 수를 한 번 알린다 — 타이핑마다가 아니라 확정된 검색어의 결과가 바뀔 때만(FR-6 · `FE-REQ-010` FR-78) */}
        <p aria-live="polite" className={styles.srOnly}>
          {query !== "" && search.data && !search.isPlaceholderData ? SEARCH_MESSAGES.resultCount(results.length) : ""}
        </p>
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

/** 첫 화면 순위 — 코인 · 국내 두 묶음이 한 목록(키보드는 이어서 내려간다). 국내 묶음은 소유자에게만 온다 */
const TopTradeValue = ({
  listId,
  crypto,
  kr,
  isPending,
  optionProps,
}: {
  listId: string;
  crypto: TopTradeValueGroup | null;
  kr: TopTradeValueGroup | null;
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
  if (!crypto && !kr) return null;
  const groups = [
    { id: "crypto", label: SEARCH_MESSAGES.topCrypto, group: crypto, offset: 0 },
    { id: "kr", label: SEARCH_MESSAGES.topKr, group: kr, offset: crypto?.items.length ?? 0 },
  ];
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
      </div>
    </section>
  );
};

/** 입력 중 — 첫 요청만 스켈레톤 · 이후는 이전 결과 유지 · 실패는 다시 시도 · 0건은 문구 + 한 줄(`FE-REQ-010` FR-103) */
const Results = ({
  listId,
  query,
  items,
  isPending,
  isError,
  onRetry,
  optionProps,
  renderAction,
}: {
  listId: string;
  query: string;
  items: AssetSearchItem[];
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
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
  if (isError) {
    return (
      <div className={styles.empty}>
        <StatusLine kind="error">{SEARCH_MESSAGES.failed}</StatusLine>
        <TextButton onClick={onRetry}>{SEARCH_MESSAGES.retry}</TextButton>
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <StatusLine kind="empty">{SEARCH_MESSAGES.empty(query)}</StatusLine>
        <span className={styles.counter}>{SEARCH_MESSAGES.emptyHint}</span>
      </div>
    );
  }
  return (
    <section aria-labelledby={`${listId}-results`}>
      <h2 id={`${listId}-results`} className={styles.sectionHead}>
        {SEARCH_MESSAGES.resultHeading}
      </h2>
      {/* 결과는 격자 — 줄마다 고르는 칸 + ★ 칸(단추를 선택지 안에 둘 수 없다). 첫 화면 순위는 ★ 가 없어 목록(listbox) */}
      <div id={listId} role="grid" aria-labelledby={`${listId}-results`} className={styles.list}>
        {items.map((item, index) => (
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
            action={renderAction(item)}
          />
        ))}
      </div>
    </section>
  );
};

export default AssetSearchDialog;

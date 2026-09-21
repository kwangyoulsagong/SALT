"use client";

import { FlexBox } from "@repo/ui/flexBox";
import { Image } from "@repo/ui/image";
import {
  ScrollTableContainer,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@repo/ui/table";
import { Text } from "@repo/ui/text";
import useDebounce from "@repo/ui/useDebounce";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ChangeRateCell,
  displayedChange,
  indexWatchlistBySymbol,
  MARKET_CHANGE_MESSAGES,
  MARKET_MESSAGES,
  MARKET_TABLE_HEADERS,
  MarketFilterTabs,
  MarketOrder,
  MarketPeriod,
  MarketPreview,
  MarketSort,
  overviewItemToPreviewSubject,
  PriceCell,
  selectRowOnKey,
  useMarketOverview,
  useMarketOverviewRealtime,
  useWatchlist,
  WatchlistAssetType,
} from "@/entities/market";
import { WatchlistStarButton } from "@/features/toggle-watchlist";

import { DEFAULT_MARKET_PARAMS } from "../model/previewParams";
import { splitLayout } from "./MarketBoardLayout.css";
import { RealtimeAsOf } from "./RealtimeAsOf";

/**
 * hover 로 프리뷰 심볼을 바꾸기까지의 대기.
 *
 * 마우스가 목록을 **지나가는 것**과 **멈추는 것**을 구분한다. 없으면 20행을 스쳐도
 * 20번 선택이 일어나고, 심볼마다 차트·지표 요청 두 개와 WebSocket 재구독이 따라온다.
 * 입력 반영 예산이 100ms 라(`performance-frontend.md` §1) 그 안쪽으로 잡았다.
 */
const HOVER_SELECT_DELAY_MS = 80;

/**
 * 실시간 테이블 + 우측 프리뷰 조합 (`market-board`).
 *
 * **변경 금지 목록이다** (FR-36): 5컬럼 · 필터 3그룹 · 변동률 blink 2초 · 2컬럼 배치.
 */
export const RealtimeMarketTable = () => {
  /**
   * 초기값이 `DEFAULT_MARKET_PARAMS` 와 **같아야 한다** — 관심 종목 탭의 프리뷰가
   * 그 파라미터로 같은 목록을 읽는다. 어긋나면 쿼리 키가 갈라져 목록을 두 번 받는다.
   */
  const [filters, setFilters] = useState<{
    sort: MarketSort;
    order: MarketOrder;
    period: MarketPeriod;
  }>({
    sort: DEFAULT_MARKET_PARAMS.sort,
    order: DEFAULT_MARKET_PARAMS.order,
    period: DEFAULT_MARKET_PARAMS.period,
  });
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [blinkingSymbol, setBlinkingSymbol] = useState<string>("");
  /**
   * hover 선택은 **디바운스해서** 넘긴다. 첫 선택(아래 effect)은 즉시다 —
   * 화면이 뜨는 순간에는 기다릴 이유가 없다.
   */
  const selectSymbol = useCallback((symbol: string) => {
    setSelectedSymbol(symbol);
  }, []);
  const selectSymbolOnHover = useDebounce(selectSymbol, HOVER_SELECT_DELAY_MS);

  const handleBlink = useCallback((symbol: string) => {
    setBlinkingSymbol(symbol);
    setTimeout(() => {
      setBlinkingSymbol("");
    }, 2000);
  }, []);

  const params = useMemo(
    () => ({
      page: DEFAULT_MARKET_PARAMS.page,
      limit: DEFAULT_MARKET_PARAMS.limit,
      sort: filters.sort,
      order: filters.order,
      period: filters.period,
    }),
    [filters],
  );

  // 크래시하지는 않지만(`data?.items ?? []`) 재시도 대기 구간에 빈 테이블이 번쩍인다.
  // 같은 이유로 `isPending` 을 본다.
  const { data, isPending, isError } = useMarketOverview(params);
  const isRealtime = filters.period === MarketPeriod.Realtime;
  const items = useMemo(() => data?.items ?? [], [data?.items]);

  /**
   * 별 상태는 **관심 종목 탭과 같은 쿼리**에서 온다 (`FE-REQ-010` FR-34).
   * 여기서 추가/제거하면 그 탭이, 그 탭에서 바꾸면 여기가 따라 바뀐다 — 두 화면을
   * 잇는 코드는 없고 캐시 키 하나가 그 일을 한다.
   */
  const { data: watchlist } = useWatchlist();
  const watchedBySymbol = useMemo(
    () => indexWatchlistBySymbol(watchlist?.items ?? []),
    [watchlist?.items],
  );
  const symbols = useMemo(() => items.map((item) => item.symbol), [items]);
  useMarketOverviewRealtime(params, symbols, handleBlink);
  const firstSymbol = items[0]?.symbol;

  useEffect(() => {
    if (firstSymbol && !selectedSymbol) {
      setSelectedSymbol(firstSymbol);
    }
  }, [firstSymbol, selectedSymbol]);

  const previewSubject = useMemo(() => {
    const found = items.find((item) => item.symbol === selectedSymbol);
    return found ? overviewItemToPreviewSubject(found) : undefined;
  }, [selectedSymbol, items]);

  if (isPending) {
    return <Text color="tertiary">{MARKET_MESSAGES.loading}</Text>;
  }

  if (isError) {
    return <Text color="tertiary">{MARKET_MESSAGES.loadFailed}</Text>;
  }

  return (
    <FlexBox direction="column">
      <MarketFilterTabs
        sort={filters.sort}
        order={filters.order}
        period={filters.period}
        onChange={(next) => setFilters((prev) => ({ ...prev, ...next }))}
      />
      <FlexBox justify="between" gap="2xl" className={splitLayout}>
        <ScrollTableContainer maxHeight="viewport" hideScrollbar>
          <Table>
            <TableHeader bordered={false}>
              <TableRow>
                <TableHeaderCell align="left">
                  <RealtimeAsOf />
                </TableHeaderCell>
                {MARKET_TABLE_HEADERS.map((th) => (
                  <TableHeaderCell key={th.id} align="right">
                    {th.value}
                  </TableHeaderCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const selected = item.symbol === selectedSymbol;
                const change = displayedChange(item, filters.period);
                // 기간 값은 틱마다 바뀌지 않는다. 바뀌지 않는 숫자가 깜박이면 거짓이다
                const blink = isRealtime && blinkingSymbol === item.symbol;
                return (
                  <TableRow
                    key={item.market}
                    /*
                    화면에 영향을 주는 값을 **전부** memoKey 에 넣는다. `TableRow` 는
                    `memoKey` 만 비교하므로(`@repo/ui/table`) 빠진 값은 바뀌어도 그려지지 않는다.
                    별 상태가 빠져 있어 채워진 별이 다음 틱에야 나타났고, **선택 상태가 빠져
                    있어 `aria-selected` 가 첫 행에 멈춰 있었다**(2026-09-21 실측).
                  */
                    memoKey={`${item.currentPrice}-${change}-${blink}-${watchedBySymbol.has(
                      item.symbol.toUpperCase(),
                    )}-${selected}`}
                    hoverable
                    clickable
                    tabIndex={0}
                    aria-selected={selected}
                    onMouseEnter={() => selectSymbolOnHover(item.symbol)}
                    onClick={() => selectSymbol(item.symbol)}
                    onKeyDown={selectRowOnKey(() => selectSymbol(item.symbol))}
                  >
                    <TableCell align="left">
                      <FlexBox align="center" gap="md">
                        <WatchlistStarButton
                          entry={watchedBySymbol.get(item.symbol.toUpperCase())}
                          displayName={item.koreanName}
                          request={{
                            assetType: WatchlistAssetType.Crypto,
                            symbol: item.symbol,
                            name: item.koreanName,
                          }}
                        />
                        <Image
                          radius={9999}
                          width={30}
                          height={30}
                          src={item.logoUrl}
                          alt={item.koreanName}
                        />
                        <Text variant="bodyLarge">{item.koreanName}</Text>
                      </FlexBox>
                    </TableCell>
                    <TableCell align="right">
                      <PriceCell value={item.currentPrice} />
                    </TableCell>
                    <TableCell align="right">
                      {change === null ? (
                        <span title={MARKET_CHANGE_MESSAGES.unknownTitle}>
                          <Text variant="bodyLarge" color="tertiary">
                            {MARKET_CHANGE_MESSAGES.unknown}
                          </Text>
                        </span>
                      ) : (
                        <ChangeRateCell value={change} blink={blink} />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <PriceCell value={item.high24h} />
                    </TableCell>
                    <TableCell align="right">
                      <PriceCell value={item.low24h} />
                    </TableCell>
                    <TableCell align="right">
                      <PriceCell
                        value={Number(item.tradeValue24h.toFixed(0))}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollTableContainer>

        <MarketPreview subject={previewSubject} />
      </FlexBox>
    </FlexBox>
  );
};

export default RealtimeMarketTable;

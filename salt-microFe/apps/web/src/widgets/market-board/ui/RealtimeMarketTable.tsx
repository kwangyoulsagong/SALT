"use client";

import { FlexBox } from "@repo/ui/flexBox";
import { Image } from "@repo/ui/image";
import { StarIcon } from "@repo/ui/starIcon";
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
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ChangeRateCell,
  MARKET_MESSAGES,
  MARKET_TABLE_HEADERS,
  MarketFilterTabs,
  MarketOrder,
  MarketPeriod,
  MarketPreview,
  MarketSort,
  PriceCell,
  useMarketOverview,
  useMarketOverviewRealtime,
} from "@/entities/market";

/**
 * 실시간 테이블 + 우측 프리뷰 조합 (`market-board`).
 *
 * **변경 금지 목록이다** (FR-36): 5컬럼 · 필터 3그룹 · 변동률 blink 2초 · 2컬럼 배치.
 */
export const RealtimeMarketTable = () => {
  const [filters, setFilters] = useState<{
    sort: MarketSort;
    order: MarketOrder;
    period: MarketPeriod;
  }>({
    sort: MarketSort.All,
    order: MarketOrder.Ascending,
    period: MarketPeriod.Realtime,
  });
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [blinkingSymbol, setBlinkingSymbol] = useState<string>("");

  const handleBlink = useCallback((symbol: string) => {
    setBlinkingSymbol(symbol);
    setTimeout(() => {
      setBlinkingSymbol("");
    }, 2000);
  }, []);

  const params = useMemo(
    () => ({
      page: 1,
      limit: 100,
      sort: filters.sort,
      order: filters.order,
      period: filters.period,
    }),
    [filters]
  );

  const { data, isLoading, isError } = useMarketOverview(params);
  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const symbols = useMemo(() => items.map((item) => item.symbol), [items]);
  useMarketOverviewRealtime(params, symbols, handleBlink);
  const firstSymbol = items[0]?.symbol;

  useEffect(() => {
    if (firstSymbol && !selectedSymbol) {
      setSelectedSymbol(firstSymbol);
    }
  }, [firstSymbol, selectedSymbol]);

  const selectedSymbolItem = useMemo(() => {
    return items.find((item) => item.symbol === selectedSymbol);
  }, [selectedSymbol, items]);

  if (isLoading) {
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
      <FlexBox justify="between" gap="2xl">
        <ScrollTableContainer maxHeight="800px" hideScrollbar>
          <Table>
            <TableHeader bordered={false}>
              <TableRow>
                <TableHeaderCell align="left">
                  <FlexBox align="center" gap="xs">
                    <Text variant="caption" color="success">
                      ●
                    </Text>
                    <Text color="tertiary">{MARKET_MESSAGES.realtimeAsOf}</Text>
                  </FlexBox>
                </TableHeaderCell>
                {MARKET_TABLE_HEADERS.map((th) => (
                  <TableHeaderCell key={th.id} align="right">
                    {th.value}
                  </TableHeaderCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow
                  key={item.market}
                  memoKey={`${item.currentPrice}-${
                    blinkingSymbol === item.symbol
                  }`}
                  hoverable
                  onMouseEnter={() => setSelectedSymbol(item.symbol)}
                >
                  <TableCell align="left">
                    <FlexBox align="center" gap="md">
                      <StarIcon />
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
                    <ChangeRateCell
                      value={item.change24h}
                      blink={blinkingSymbol === item.symbol}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <PriceCell value={item.high24h} />
                  </TableCell>
                  <TableCell align="right">
                    <PriceCell value={item.low24h} />
                  </TableCell>
                  <TableCell align="right">
                    <PriceCell value={Number(item.tradeValue24h.toFixed(0))} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollTableContainer>

        <MarketPreview
          selectedSymbolItem={selectedSymbolItem}
          symbol={selectedSymbol}
        />
      </FlexBox>
    </FlexBox>
  );
};

export default RealtimeMarketTable;

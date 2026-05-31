import { FlexBox } from "@repo/ui/flexBox";
import {
  ScrollTableContainer,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@repo/ui/table";
import { Image } from "@repo/ui/image";
import { StarIcon } from "@repo/ui/starIcon";
import InvestmentFilterTabs from "../InvestmentFilterTabs/InvestmentFilterTabs";
import { Text } from "@repo/ui/text";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Order,
  Period,
  Sort,
} from "../InvestmentFilterTabs/FilterTabsOptions/FilterTabsOptions";
import useInvestments from "@/hooks/api/investments/useInvestments";
import { useMarketOverviewRealtime } from "@/hooks/investments/useMarketOverviewRealtime";
import PriceCell from "../PriceCell/PriceCell";
import ChangeRateCell from "../ChangeRateCell/ChangeRateCell";
import MarketPreview from "../MarketPreview/MarketPreview";
import { TableHeaderCells } from "./TableHeaderCells/TableHeaderCells";

const RealtimeInvestment = () => {
  const [filters, setFilters] = useState<{
    sort: Sort;
    order: Order;
    period: Period;
  }>({
    sort: "",
    order: "",
    period: "",
  });
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [blinkingSymbol, setBlinkingSymbol] = useState<string>("");

  const handleBlink = useCallback((symbol: string) => {
    setBlinkingSymbol(symbol);
    setTimeout(() => {
      setBlinkingSymbol("");
    }, 2000);
  }, []);

  const { investmentsMarketOverview } = useInvestments();

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

  const { data, isLoading, isError } = investmentsMarketOverview(params);
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
    return <Text color="tertiary">실시간 투자 정보를 불러오는 중입니다.</Text>;
  }

  if (isError) {
    return <Text color="tertiary">실시간 투자 정보를 불러오지 못했습니다.</Text>;
  }

  return (
    <FlexBox direction="column">
      <InvestmentFilterTabs
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
                    <Text color="tertiary">실시간 오늘 19:30 기준</Text>
                  </FlexBox>
                </TableHeaderCell>
                {TableHeaderCells.map((th) => (
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
export default RealtimeInvestment;

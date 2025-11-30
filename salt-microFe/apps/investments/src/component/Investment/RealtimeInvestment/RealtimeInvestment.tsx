import { FlexBox } from "@repo/ui/flexBox";
import {
  ScrollTableContainer,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@repo/ui/table";
import { Image } from "@repo/ui/image";
import { StarIcon } from "@repo/ui/starIcon";
import InvestmentFilterTabs from "../InvestmentFilterTabs/InvestmentFilterTabs";
import { ScrollContainer } from "@repo/ui/scrollContainer";
import { Text } from "@repo/ui/text";
import { useMemo, useRef, useState } from "react";
import {
  Order,
  Period,
  Sort,
} from "../InvestmentFilterTabs/FilterTabsOptions/FilterTabsOptions";
import useInvestments from "@/hooks/api/investments/useInvestments";
import { useMarketOverviewRealtime } from "@/hooks/investments/useMarketOverviewRealtime";
import PriceCell from "../PriceCell/PriceCell";
import ChangeRateCell from "../ChangeRateCell/ChangeRateCell";
const TableHeaderCells = [
  {
    id: "currentPrice",
    value: "현재가",
  },
  {
    id: "changeRate",
    value: "변동률",
  },
  {
    id: "highPrice",
    value: "최고가",
  },
  {
    id: "lowPrice",
    value: "최저가",
  },
  {
    id: "trade_value",
    value: "거래대금",
  },
];
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

  const blinkRef = useRef<{ [symbol: string]: boolean }>({});
  const [, forceRender] = useState(0);

  const handleBlink = (symbol: string) => {
    blinkRef.current[symbol] = true;
    forceRender((v) => v + 1);
    setTimeout(() => {
      blinkRef.current[symbol] = false;
      forceRender((v) => v + 1);
    }, 1000);
  };

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

  const { data } = investmentsMarketOverview(params);
  useMarketOverviewRealtime(params, handleBlink);
  return (
    <FlexBox direction="column">
      <InvestmentFilterTabs
        sort={filters.sort}
        order={filters.order}
        period={filters.period}
        onChange={(next) => setFilters((prev) => ({ ...prev, ...next }))}
      />
      <FlexBox justify="between">
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
              {data?.items?.map((item) => (
                <TableRow
                  key={item.market}
                  memoKey={`${item.currentPrice}-${
                    blinkRef.current[item.symbol]
                  }`}
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
                      blink={blinkRef.current[item.symbol]}
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
        <ScrollContainer direction="vertical" maxHeight="2xl">
          <div>Hello</div>
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>{" "}
          <div>Hello</div> <div>Hello</div> <div>Hello</div> <div>Hello</div>
        </ScrollContainer>
      </FlexBox>
    </FlexBox>
  );
};
export default RealtimeInvestment;

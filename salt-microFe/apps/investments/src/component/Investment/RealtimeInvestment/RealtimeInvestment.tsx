import { FlexBox } from "@repo/ui/flexBox";
import {
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
import { Text } from "@repo/ui/text";
import { FormatPrice } from "@/utils/FormatPrice";
import { useMemo, useState } from "react";
import {
  Order,
  Period,
  Sort,
} from "../InvestmentFilterTabs/FilterTabsOptions/FilterTabsOptions";
import useInvestments from "@/hooks/api/investments/useInvestments";
import { useMarketOverviewRealtime } from "@/hooks/investments/useMarketOverviewRealtime";
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

  const [blink, setBlink] = useState<{ [symbol: string]: boolean }>({});

  const handleBlink = (symbol: string) => {
    setBlink((prev) => ({ ...prev, [symbol]: true }));
    setTimeout(() => {
      setBlink((prev) => ({ ...prev, [symbol]: false }));
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
        <TableContainer>
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
                <TableRow key={item.market}>
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
                    <Text variant="bodyLarge">
                      {FormatPrice(item.currentPrice)} 원
                    </Text>
                  </TableCell>
                  <TableCell align="right">
                    <div
                      style={{
                        padding: "2px 6px",
                        borderRadius: "5px",
                        display: "inline-block",
                        background: blink[item.symbol]
                          ? item.change24h < 0
                            ? "#EAF3FF"
                            : "#FFEFF1"
                          : "transparent",
                        transition: "background 0.3s ease",
                      }}
                    >
                      <Text
                        variant="bodyLarge"
                        color={item.change24h > 0 ? "up" : "down"}
                      >
                        {item.change24h > 0 && "+"}
                        {item.change24h.toFixed(2)} %
                      </Text>
                    </div>
                  </TableCell>
                  <TableCell align="right">
                    <Text variant="bodyLarge">
                      {FormatPrice(item.high24h)} 원
                    </Text>
                  </TableCell>
                  <TableCell align="right">
                    <Text variant="bodyLarge">
                      {FormatPrice(item.low24h)} 원
                    </Text>
                  </TableCell>
                  <TableCell align="right">
                    {FormatPrice(Number(item.volume24h.toFixed(0)))} 원
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <div style={{ width: 400 }}></div>
      </FlexBox>
    </FlexBox>
  );
};
export default RealtimeInvestment;

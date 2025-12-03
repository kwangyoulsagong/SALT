import {
  investmentsAPi,
  MarketOverviewParams,
} from "@/api/investments/investments";
import { investmentsApi } from "@/api/mock/investments/investments";
import { querykeys } from "@/constants/queryKeys";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

const useInvestments = () => {
  const investmentsPreview = useQuery({
    queryKey: [querykeys.InvestmentsPreview],
    queryFn: investmentsApi.investmentsPreview,
  });
  const investmentsMarketOverview = (params: MarketOverviewParams) =>
    useSuspenseQuery({
      queryKey: [querykeys.MarketOverview, params],
      queryFn: () => investmentsAPi.marketOverview(params),
    });

  const investmentsMarketChartPreview = (symbol: string) =>
    useSuspenseQuery({
      queryKey: [querykeys.MarketChartPreview, symbol],
      queryFn: () => investmentsAPi.MarketChartPreview(symbol),
    });
  return {
    investmentsPreview,
    investmentsMarketOverview,
    investmentsMarketChartPreview,
  };
};
export default useInvestments;

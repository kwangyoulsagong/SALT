import {
  investmentsAPi,
  MarketChartPreviewResponse,
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
      queryFn: async () => {
        const res = await investmentsAPi.MarketChartPreview(symbol);
        return {
          ...res,
          data: [...res.data].reverse(),
        };
      },
    });
  return {
    investmentsPreview,
    investmentsMarketOverview,
    investmentsMarketChartPreview,
  };
};
export default useInvestments;

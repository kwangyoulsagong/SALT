import {
  investmentsAPi,
  MarketOverviewParams,
} from "@/api/investments/investments";
import { investmentsApi } from "@/api/mock/investments/investments";
import { querykeys } from "@/constants/queryKeys";
import { useQuery } from "@tanstack/react-query";

const useInvestments = () => {
  const investmentsPreview = useQuery({
    queryKey: [querykeys.InvestmentsPreview],
    queryFn: investmentsApi.investmentsPreview,
  });
  const useInvestmentsMarketOverview = (params: MarketOverviewParams) =>
    useQuery({
      queryKey: [querykeys.MarketOverview, params],
      queryFn: () => investmentsAPi.marketOverview(params),
    });

  const useInvestmentsMarketChartPreview = (symbol: string) =>
    useQuery({
      queryKey: [querykeys.MarketChartPreview, symbol],
      queryFn: async () => {
        const res = await investmentsAPi.marketChartPreview(symbol);
        return {
          ...res,
          data: [...res.data].reverse(),
        };
      },
      enabled: Boolean(symbol),
    });
  const useInvestmentMarketIntelligencePreview = (symbol: string) =>
    useQuery({
      queryKey: [querykeys.MarketIntelligencePreview, symbol],
      queryFn: () => investmentsAPi.marketIntelligencePreview(symbol),
      enabled: Boolean(symbol),
    });

  return {
    investmentsPreview,
    investmentsMarketOverview: useInvestmentsMarketOverview,
    investmentsMarketChartPreview: useInvestmentsMarketChartPreview,
    investmentMarketIntelligencePreview: useInvestmentMarketIntelligencePreview,
  };
};
export default useInvestments;

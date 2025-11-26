import {
  investmentsAPi,
  MarketOverviewItem,
  MarketOverviewParams,
  MarketOverviewResponse,
} from "@/api/investments/investments";
import { investmentsApi } from "@/api/mock/investments/investments";
import { querykeys } from "@/constants/queryKeys";
import { wsClient } from "@/libs/webSocketClient/webSocketClient";
import {
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useEffect } from "react";

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

  return {
    investmentsPreview,
    investmentsMarketOverview,
  };
};
export default useInvestments;

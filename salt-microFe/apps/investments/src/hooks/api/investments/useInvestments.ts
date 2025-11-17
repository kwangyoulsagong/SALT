import { investmentsApi } from "@/api/mock/investments/investments";
import { querykeys } from "@/constants/queryKeys";
import { useQuery } from "@tanstack/react-query";

const useInvestments = () => {
  const investmentsPreview = useQuery({
    queryKey: [querykeys.InvestmentsPreview],
    queryFn: investmentsApi.investmentsPreview,
  });
  return { investmentsPreview };
};
export default useInvestments;

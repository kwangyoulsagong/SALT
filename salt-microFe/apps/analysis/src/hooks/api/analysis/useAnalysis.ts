import { analysisApi } from "@/api/mock/analysis/analysis";
import { querykeys } from "@/constants/queryKeys";
import { useQuery } from "@tanstack/react-query";

const useAnalysis = () => {
  const analysisPreview = useQuery({
    queryKey: [querykeys.AnalysisPreview],
    queryFn: analysisApi.analysisPreview,
  });
  return { analysisPreview };
};
export default useAnalysis;

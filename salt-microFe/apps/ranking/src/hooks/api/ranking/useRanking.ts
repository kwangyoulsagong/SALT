import { rankingApi } from "@/api/mock/ranking/ranking";
import { querykeys } from "@/constants/queryKeys";
import { useQuery } from "@tanstack/react-query";

const useRanking = () => {
  const myRanking = useQuery({
    queryKey: [querykeys.MyRanking],
    queryFn: rankingApi.myRanks,
  });

  return { myRanking };
};
export default useRanking;

import { goalsApi } from "@/api/mock/goals/goals";
import { querykeys } from "@/constants/queryKeys";
import { useQuery } from "@tanstack/react-query";

const useGoals = () => {
  const myGoals = useQuery({
    queryKey: [querykeys.MyGoals],
    queryFn: goalsApi.myGoals,
  });
  return { myGoals };
};
export default useGoals;

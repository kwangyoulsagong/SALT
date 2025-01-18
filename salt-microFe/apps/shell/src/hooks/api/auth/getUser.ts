import fetchUser from "@/api/mock/auth/fetchUser/fetchUser";
import { querykeys } from "@/constants/queryKeys";
import { useQuery } from "@tanstack/react-query";

const getUser = () => {
  return useQuery({
    queryKey: [querykeys.User],
    queryFn: fetchUser,
  });
};
export default getUser;

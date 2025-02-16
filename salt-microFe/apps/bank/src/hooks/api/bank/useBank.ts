import { bankApi } from "@/api/mock/bank/bank";
import { querykeys } from "@/constants/queryKeys";
import { useMutation, useQuery } from "@tanstack/react-query";

const useBank = () => {
  const bankToken = localStorage.getItem("bankToken");
  const auth = useMutation({
    mutationFn: bankApi.auth,
    onSuccess: (data) => {
      const { access_token } = data;
      localStorage.setItem("bankToken", access_token);
    },
  });

  const accountList = useQuery({
    queryKey: [querykeys.AccountList, bankToken],
    queryFn: bankApi.accountList,
  });
  return { auth, accountList };
};
export default useBank;

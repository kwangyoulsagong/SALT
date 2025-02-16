import { bankApi } from "@/api/mock/bank/bank";
import { useMutation } from "@tanstack/react-query";

const useBank = () => {
  const auth = useMutation({
    mutationFn: bankApi.auth,
    onSuccess: (data) => {
      const { access_token } = data;
      console.log(access_token);
    },
  });
  return { auth };
};
export default useBank;

import { authApi } from "@/api/mock/auth/auth";
import { useAppDispatch } from "@/hooks/redux/hooks";
import { setUser } from "@/store/redux/features/auth/authSlice";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/router";

const useAuth = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      dispatch(setUser(data));
      router.push("/home");
    },
    onError: (error: Error) => {
      console.error("로그인 실패:", error.message);
      throw error;
    },
  });
  return {
    login,
  };
};
export default useAuth;

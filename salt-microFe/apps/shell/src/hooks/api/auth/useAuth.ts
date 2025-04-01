import { authApi } from "@/api/mock/auth/auth";
import { USER_KEY } from "@/constants/api";
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
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      const userData = localStorage.getItem(USER_KEY);
      if (userData) {
        dispatch(setUser(JSON.parse(userData)));
      }
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

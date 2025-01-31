import { USER_KEY } from "@/constants/api";
import { useAppDispatch } from "../redux/hooks";
import { setUser } from "@/store/redux/features/auth/authSlice";
import { useEffect } from "react";

export const useAuthInitialize = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const initializeAuth = () => {
      const userData = localStorage.getItem(USER_KEY);

      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          dispatch(setUser(parsedUser));
        } catch (error) {
          console.error("유저 데이터 조회 에러", error);
          localStorage.removeItem(USER_KEY);
        }
      }
    };
    initializeAuth();
  }, [dispatch]);
};

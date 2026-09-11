"use client";

import { useEffect } from "react";

import { USER_KEY } from "@/shared/config";
import { useAppDispatch } from "@/shared/lib";

import { setUser } from "../model/authSlice";

/**
 * 새로고침 후 세션 복원.
 *
 * `localStorage` 를 읽으므로 effect 안에서만 돈다. 쿠키 기반으로 옮기면(`FE-REQ-013`)
 * 이 훅과 `shared/config/auth.ts` 만 바뀐다.
 */
export const useInitializeAuth = (): void => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const userData = localStorage.getItem(USER_KEY);
    if (!userData) return;

    try {
      dispatch(setUser(JSON.parse(userData)));
    } catch (error) {
      console.error("유저 데이터 조회 에러", error);
      localStorage.removeItem(USER_KEY);
    }
  }, [dispatch]);
};

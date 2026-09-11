"use client";

import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { setUser } from "@/entities/auth";
import { ROUTES, USER_KEY } from "@/shared/config";
import { useAppDispatch } from "@/shared/lib";

import { SignInRequest, SignInResponse } from "../model/types";
import { signInApi } from "./signInApi";

/** 로그인 성공 시 세션을 `entities/auth` store 에 올리고 홈으로 보낸다. */
export const useSignIn = (): UseMutationResult<
  SignInResponse,
  Error,
  SignInRequest
> => {
  const dispatch = useAppDispatch();
  const router = useRouter();

  return useMutation({
    mutationFn: signInApi.signIn,
    onSuccess: (data) => {
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      const userData = localStorage.getItem(USER_KEY);
      if (userData) {
        dispatch(setUser(JSON.parse(userData)));
      }
      router.push(ROUTES.home);
    },
    onError: (error: Error) => {
      console.error("로그인 실패:", error.message);
      throw error;
    },
  });
};

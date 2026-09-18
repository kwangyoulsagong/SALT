"use client";

import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { setUser } from "@/entities/auth";
import { writeSession } from "@/shared/api";
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
      // **토큰을 저장하지 않고 있었다.** `USER_KEY` 만 쓰고 있어서 로그인에 성공해도
      // `authHeader()` 가 빈 객체였고, `/api/app/*` 를 부르는 화면이 전부 401 이었다.
      // 경위는 `shared/api/authToken.ts` 의 `writeSession` 주석에 있다.
      writeSession({ accessToken: data.token });
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

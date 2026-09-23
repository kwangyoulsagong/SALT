"use client";

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { setUser } from "@/entities/auth";
import { writeSession } from "@/shared/api";
import { ROUTES, USER_KEY } from "@/shared/config";
import { useAppDispatch } from "@/shared/lib";

import type { SignInRequest, SignInResponse } from "../model/types";
import { signInApi, SignInError } from "./signInApi";

/**
 * 로그인 성공 시 세션을 저장하고 홈으로 보낸다.
 *
 * ## 리프레시 토큰을 같이 저장한다 (2026-09-23)
 *
 * 전에는 `writeSession({ accessToken: data.token })` 이었다 — 목 응답에 리프레시 토큰이
 * 없었기 때문이다. 그래서 15분 뒤 갱신할 재료가 없었고 화면이 조용히 401 로 떨어졌다.
 *
 * ## 로그인 직후 쿼리를 전부 무효화한다
 *
 * 토큰 없이 실행돼 401 로 끝난 쿼리들이 캐시에 남아 있다(코치 · 관심 목록 · 보유).
 * 무효화하지 않으면 홈에 도착해도 그 실패가 그대로 보인다.
 */
export const useSignIn = (): UseMutationResult<
  SignInResponse,
  SignInError,
  SignInRequest
> => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation<SignInResponse, SignInError, SignInRequest>({
    mutationFn: signInApi.signIn,
    // 자격 증명이 틀린 것은 다시 보내도 같다. mutation 이라 기본값도 0 이지만 명시한다.
    retry: false,
    onSuccess: (data) => {
      writeSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      } catch {
        // 프라이빗 모드에서는 저장이 던진다. store 에는 올라가므로 이 세션은 그대로 쓴다.
      }
      dispatch(setUser(data.user));

      void queryClient.invalidateQueries();
      router.replace(ROUTES.home);
    },
  });
};

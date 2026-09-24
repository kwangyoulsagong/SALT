"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { logout } from "@/entities/auth";
import { clearSession } from "@/shared/api";
import { ROUTES } from "@/shared/config";
import { useAppDispatch } from "@/shared/lib";

/**
 * 로그아웃 — 세션을 비우고 로그인 화면으로 보낸다.
 *
 * ## 서버를 부르지 않는다
 *
 * 서버 · BFF 에 로그아웃 경로가 없다. 토큰은 서버에 저장되지 않는 JWT 라서 이 기기에서 지우는 것이
 * 곧 로그아웃이다. 리프레시 토큰을 서버에서 무효화하는 일은 `FE-REQ-013`(쿠키 세션)과 함께 온다.
 *
 * ## 캐시를 무효화가 아니라 **지운다**
 *
 * 로그인(`useSignIn`)은 `invalidateQueries` 로 다시 받는다. 로그아웃은 반대다 — 다음 사람이 같은
 * 기기로 로그인하기 전까지 이전 사용자의 보유 · 관심 목록 · 전망이 캐시에 남으면 안 된다.
 */
export const useSignOut = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const queryClient = useQueryClient();

  return useCallback(() => {
    clearSession();
    dispatch(logout());
    queryClient.clear();
    router.replace(ROUTES.login);
  }, [dispatch, queryClient, router]);
};

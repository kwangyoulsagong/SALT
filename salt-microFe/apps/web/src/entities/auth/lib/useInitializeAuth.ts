"use client";

import { useEffect } from "react";

import { hasSession } from "@repo/web-shared/api";
import { USER_KEY } from "@repo/web-shared/config";
import { useAppDispatch } from "@repo/web-shared/lib";

import { setUser } from "../model/authSlice";

/**
 * 새로고침 후 세션 복원.
 *
 * 사용자 정보는 `localStorage`, 세션 유무는 표지 쿠키(`FE-REQ-013` FR-80 2단계) — 둘 다 브라우저 값이라 effect 안에서만 돈다.
 *
 * **세션 없이 남은 사용자 정보는 복원하지 않고 지운다**(2026-11-03). 반쪽 세션이면 화면은 "로그인됨", 서버 · 표지 쿠키는
 * "로그아웃"이라 로그인 화면과 홈 사이를 오갔다. 지우는 것은 사용자 정보뿐 — 세션 전체 비우기(`clearSession`)는 서버가 거부했을 때만.
 */
export const useInitializeAuth = (): void => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const userData = localStorage.getItem(USER_KEY);
    if (!userData) return;
    if (!hasSession()) {
      localStorage.removeItem(USER_KEY);
      return;
    }

    try {
      dispatch(setUser(JSON.parse(userData)));
    } catch (error) {
      console.error("유저 데이터 조회 에러", error);
      localStorage.removeItem(USER_KEY);
    }
  }, [dispatch]);
};

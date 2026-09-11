"use client";

import { useSelector } from "react-redux";

import { AuthRootState, AuthState, User } from "./types";

/**
 * 이 슬라이스의 셀렉터.
 *
 * store 전체 타입(`RootState`)을 쓰지 않는 이유는 그것이 `app` 레이어의 것이기 때문이다.
 * 슬라이스는 **자기 가지만** 타이핑한다 — 그래야 위로 향하는 의존이 생기지 않는다.
 */
export const useAuthState = (): AuthState =>
  useSelector((state: AuthRootState) => state.auth);

export const useAuthUser = (): User | null =>
  useSelector((state: AuthRootState) => state.auth.user);

export const useIsAuthenticated = (): boolean =>
  useSelector((state: AuthRootState) => state.auth.isAuthenticated);

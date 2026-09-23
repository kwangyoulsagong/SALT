"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useIsAuthenticated } from "@/entities/auth";
import { ROUTES } from "@/shared/config";

/**
 * 이미 로그인한 사람을 홈으로 보낸다. 그 외에는 **아무것도 하지 않는다.**
 *
 * ## 전에는 자기 자신으로 보내고 있었다 (2026-09-23)
 *
 * `AuthGuard` 가 `router.push(isAuthenticated ? home : login)` 이었다. 로그인 화면이 곧
 * `ROUTES.login`(`/`)이라, 로그인하지 않은 사람은 **매 렌더마다 자기 자신으로 push** 됐다.
 * 이동이 없으니 눈에는 안 보이지만 히스토리와 렌더를 계속 건드린다.
 *
 * 그리고 이름이 "가드"인데 막는 것이 없었다 — 비공개 경로를 보호하는 일은 이 컴포넌트가
 * 아니고(`FE-REQ-011` FR-61), 그 자리는 토큰이 쿠키로 간 뒤의 미들웨어다(`FE-REQ-013`).
 * 하는 일에 맞는 이름으로 바꿔 그 오해를 지운다.
 *
 * 그리지 않는다 — 껍데기가 이것을 폼과 나란히 두므로 폼이 이 판단을 기다리지 않는다.
 */
export const RedirectSignedIn = () => {
  const isAuthenticated = useIsAuthenticated();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) router.replace(ROUTES.home);
  }, [isAuthenticated, router]);

  return null;
};

export default RedirectSignedIn;

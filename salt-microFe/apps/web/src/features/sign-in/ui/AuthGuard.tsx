"use client";

// 클라이언트 잎: 인증 상태에 따라 라우팅한다.
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

import { useIsAuthenticated } from "@/entities/auth";
import { ROUTES } from "@/shared/config";

export const AuthGuard = ({ children }: { children: ReactNode }) => {
  const isAuthenticated = useIsAuthenticated();
  const router = useRouter();

  useEffect(() => {
    router.push(isAuthenticated ? ROUTES.home : ROUTES.login);
  }, [isAuthenticated, router]);

  return <>{children}</>;
};

export default AuthGuard;

"use client";

// 클라이언트 잎: 인증 상태에 따라 라우팅한다.
import { useAppSelector } from "@/hooks/redux/hooks";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

const AuthGuard = ({ children }: { children: ReactNode }) => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const router = useRouter();
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/");
    } else if (isAuthenticated) {
      router.push("/home");
    }
  }, [isAuthenticated, router]);
  return <>{children}</>;
};
export default AuthGuard;

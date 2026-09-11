"use client";

import { ReactNode } from "react";

import { useInitializeAuth } from "@/entities/auth";

/** 새로고침 후 세션 복원만 한다. 화면을 그리지 않는다 (`fsd-app.md`). */
const AuthInitializer = ({ children }: { children: ReactNode }) => {
  useInitializeAuth();
  return <>{children}</>;
};

export default AuthInitializer;

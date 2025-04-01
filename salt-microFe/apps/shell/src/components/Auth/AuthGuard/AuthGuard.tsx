import { useAppSelector } from "@/hooks/redux/hooks";
import { useRouter } from "next/router";
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
  }, [isAuthenticated]);
  return <>{children}</>;
};
export default AuthGuard;

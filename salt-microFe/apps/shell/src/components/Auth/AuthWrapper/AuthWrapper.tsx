import { useAuthInitialize } from "@/hooks/initializeAuth/intializeAuth";
import { ReactNode } from "react";

const AuthWrapper = ({ children }: { children: ReactNode }) => {
  useAuthInitialize();
  return <>{children}</>;
};
export default AuthWrapper;

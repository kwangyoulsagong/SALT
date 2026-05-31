import { ReactNode } from "react";
import { Wrapper } from "./Styles/ServiceWrapper.css";

export const ServiceWrapper = ({ children }: { children: ReactNode }) => {
  return <div className={Wrapper}>{children}</div>;
};

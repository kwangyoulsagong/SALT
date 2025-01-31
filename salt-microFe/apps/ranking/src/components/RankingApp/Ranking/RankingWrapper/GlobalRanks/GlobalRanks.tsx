import { ReactNode } from "react";
import { Wrapper } from "./GlobalRanks.css";

const GlobalRanks = ({ children }: { children: ReactNode }) => {
  return <section className={Wrapper}>{children}</section>;
};
export default GlobalRanks;

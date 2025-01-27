import { ReactNode } from "react";
import { Wrapper } from "./RankingWrapper.css";

const RankingWrapper = ({ children }: { children: ReactNode }) => {
  return <section className={Wrapper}>{children}</section>;
};
export default RankingWrapper;

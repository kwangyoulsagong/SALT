import { ReactNode } from "react";
import { Wrapper } from "./RankingWrapper.css";

const RankingWrapper = ({ children }: { children: ReactNode }) => {
  return <article className={Wrapper}>{children}</article>;
};
export default RankingWrapper;

import { ReactNode } from "react";
import { Wrapper } from "./TipsWrapper.css";

const TipsWrapper = ({ children }: { children: ReactNode }) => {
  return <article className={Wrapper}>{children}</article>;
};
export default TipsWrapper;

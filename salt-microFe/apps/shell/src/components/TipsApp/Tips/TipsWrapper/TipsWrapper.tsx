import { ReactNode } from "react";
import { Wrapper } from "./TipsWrapper.css";

const TipsWrapper = ({ children }: { children: ReactNode }) => {
  return <section className={Wrapper}>{children}</section>;
};
export default TipsWrapper;

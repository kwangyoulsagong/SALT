import { ReactNode } from "react";
import { Wrapper } from "./InfoWrapper.css";

const InfoWrapper = ({ children }: { children: ReactNode }) => {
  return <article className={Wrapper}>{children}</article>;
};
export default InfoWrapper;

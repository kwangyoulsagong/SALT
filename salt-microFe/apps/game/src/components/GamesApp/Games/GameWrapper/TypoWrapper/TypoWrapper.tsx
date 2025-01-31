import { ReactNode } from "react";
import { Wrapper } from "./TypoWrapper.css";

const TypoWrapper = ({ children }: { children: ReactNode }) => {
  return <article className={Wrapper}>{children}</article>;
};
export default TypoWrapper;

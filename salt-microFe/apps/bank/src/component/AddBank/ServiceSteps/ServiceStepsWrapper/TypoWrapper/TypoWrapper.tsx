import { ReactNode } from "react";
import { Wrapper } from "./TypoWrapper.css";

const TypoWrapper = ({ children }: { children: ReactNode }) => {
  return <section className={Wrapper}>{children}</section>;
};
export default TypoWrapper;

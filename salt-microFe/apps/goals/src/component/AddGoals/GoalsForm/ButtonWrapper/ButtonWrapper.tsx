import { ReactNode } from "react";
import { Wrapper } from "./ButtonWrapper.css";

const ButtonWrapper = ({ children }: { children: ReactNode }) => {
  return <article className={Wrapper}>{children}</article>;
};
export default ButtonWrapper;

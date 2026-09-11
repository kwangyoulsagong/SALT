import { ReactNode } from "react";
import { Wrapper } from "./SubmitButtonWrapper.css";

const SubmitButtonWrapper = ({ children }: { children: ReactNode }) => {
  return <section className={Wrapper}>{children}</section>;
};
export default SubmitButtonWrapper;

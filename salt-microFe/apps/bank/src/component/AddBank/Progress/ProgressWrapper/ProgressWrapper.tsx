import { ReactNode } from "react";
import { Wrapper } from "./ProgressWrapper.css";

const ProgressWrapper = ({ children }: { children: ReactNode }) => {
  return <section className={Wrapper}>{children}</section>;
};
export default ProgressWrapper;

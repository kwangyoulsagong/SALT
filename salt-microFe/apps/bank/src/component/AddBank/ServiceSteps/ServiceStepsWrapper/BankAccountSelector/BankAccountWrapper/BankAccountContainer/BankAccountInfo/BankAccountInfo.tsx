import { ReactNode } from "react";
import { Wrapper } from "./BankAccountInfo.css";

const BankAccountInfo = ({ children }: { children: ReactNode }) => {
  return <article className={Wrapper}>{children}</article>;
};
export default BankAccountInfo;

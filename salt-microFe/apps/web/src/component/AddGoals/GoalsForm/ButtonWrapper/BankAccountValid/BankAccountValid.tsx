import { ReactNode } from "react";
import { Wrapper } from "./BankAccountValid.css";

const BankAccountValid = ({ children }: { children: ReactNode }) => {
  return <article className={Wrapper}>{children}</article>;
};
export default BankAccountValid;

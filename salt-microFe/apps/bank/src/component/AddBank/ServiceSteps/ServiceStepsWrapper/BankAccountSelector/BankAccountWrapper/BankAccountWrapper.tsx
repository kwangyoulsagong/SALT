import { ReactNode } from "react";
import { Wrapper } from "./BankAccountWrapper.css";

const BankAccountWrapper = ({ children }: { children: ReactNode }) => {
  return <section className={Wrapper}>{children}</section>;
};
export default BankAccountWrapper;

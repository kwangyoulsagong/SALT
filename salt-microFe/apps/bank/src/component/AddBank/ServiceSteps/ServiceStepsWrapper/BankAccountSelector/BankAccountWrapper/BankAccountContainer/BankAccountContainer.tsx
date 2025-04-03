import { ReactNode } from "react";
import { Wrapper } from "./BankAccountContainer.css";

const BankAccountContainer = ({ children }: { children: ReactNode }) => {
  return <section className={Wrapper}>{children}</section>;
};
export default BankAccountContainer;

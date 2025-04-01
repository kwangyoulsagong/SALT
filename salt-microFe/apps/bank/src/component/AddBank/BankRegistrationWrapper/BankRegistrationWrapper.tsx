import { ReactNode } from "react";
import { Wrapper } from "./BankRegistrationWrapper.css";

const BankRegistrationWrapper = ({ children }: { children: ReactNode }) => {
  return <div className={Wrapper}>{children}</div>;
};
export default BankRegistrationWrapper;

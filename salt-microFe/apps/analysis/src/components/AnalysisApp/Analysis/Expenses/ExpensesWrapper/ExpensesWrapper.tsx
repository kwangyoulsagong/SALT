import { ReactNode } from "react";
import { Wrapper } from "./ExpensesWrapper.css";

const ExpensesWrapper = ({ children }: { children: ReactNode }) => {
  return <article className={Wrapper}>{children}</article>;
};
export default ExpensesWrapper;

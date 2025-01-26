import { ReactNode } from "react";
import { Wrapper } from "./ExpensesWrapper.css";

const ExpensesWrapper = ({ children }: { children: ReactNode }) => {
  return <section className={Wrapper}>{children}</section>;
};
export default ExpensesWrapper;

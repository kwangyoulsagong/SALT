import { ReactNode } from "react";
import { Wrapper } from "./Expenses.css";

const Expenses = ({ children }: { children: ReactNode }) => {
  return <section className={Wrapper}>{children}</section>;
};
export default Expenses;

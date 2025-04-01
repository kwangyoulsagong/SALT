import { ReactNode } from "react";
import { Bar } from "./StepsBar.css";

const StepsBar = ({ children }: { children: ReactNode }) => {
  return <article className={Bar}>{children}</article>;
};
export default StepsBar;

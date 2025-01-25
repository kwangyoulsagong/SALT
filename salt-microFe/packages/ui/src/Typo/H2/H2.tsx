import { ReactNode } from "react";
import { H2Typography } from "./styles/H2.css.ts";

export const H2 = ({ children }: { children: ReactNode }) => {
  return <h2 className={H2Typography}>{children}</h2>;
};

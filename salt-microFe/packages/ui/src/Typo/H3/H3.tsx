import { ReactNode } from "react";
import { H3Typography } from "./styles/H3.css.ts";

export const H3 = ({ children }: { children: ReactNode }) => {
  return <h3 className={H3Typography}>{children}</h3>;
};

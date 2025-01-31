import { ReactNode } from "react";
import { H4Typography } from "./styles/H4.css.ts";

export const H4 = ({ children }: { children: ReactNode }) => {
  return <h4 className={H4Typography}>{children}</h4>;
};

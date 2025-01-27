import { ReactNode } from "react";
import { Wrapper } from "./Header.css.ts";

export const Header = ({ children }: { children: ReactNode }) => {
  return <header className={Wrapper}>{children}</header>;
};

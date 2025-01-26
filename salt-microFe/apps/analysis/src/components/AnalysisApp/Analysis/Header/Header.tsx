import { ReactNode } from "react";
import { Wrapper } from "./Header.css";

const Header = ({ children }: { children: ReactNode }) => {
  return <header className={Wrapper}>{children}</header>;
};
export default Header;

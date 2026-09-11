import { ReactNode } from "react";
import { Container } from "./style/Layout.css";
interface LayoutProps {
  children: ReactNode;
}
const Layout = ({ children }: LayoutProps) => {
  return <div className={Container}>{children}</div>;
};
export default Layout;

import { Container } from "@/components/style/Layout.css";
import { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}
const Layout = ({ children }: LayoutProps) => {
  return <div className={Container}>{children}</div>;
};
export default Layout;

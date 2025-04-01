import { ReactNode } from "react";
import { Container } from "./HomeContainer.css";

const HomeContainer = ({ children }: { children: ReactNode }) => {
  return <div className={Container}>{children}</div>;
};
export default HomeContainer;

import { ReactNode } from "react";
import { Container } from "./Wrapper.css";

const Wrapper = ({ children }: { children: ReactNode }) => {
  return <section className={Container}>{children}</section>;
};
export default Wrapper;

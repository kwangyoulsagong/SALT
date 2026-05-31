import { ReactNode } from "react";
import { Container } from "./Wrapper.css";

export const Wrapper = ({ children }: { children: ReactNode }) => {
  return <section className={Container}>{children}</section>;
};

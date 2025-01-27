import { ReactNode } from "react";
import { Wrapper } from "./GameWrapper.css";

const GameWrapper = ({ children }: { children: ReactNode }) => {
  return <article className={Wrapper}>{children}</article>;
};
export default GameWrapper;

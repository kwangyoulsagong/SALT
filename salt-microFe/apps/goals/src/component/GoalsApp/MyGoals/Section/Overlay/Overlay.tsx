import { ReactNode } from "react";
import { Wrapper } from "./Overlay.css";

const Overlay = ({ children }: { children: ReactNode }) => {
  return <div className={Wrapper}>{children}</div>;
};
export default Overlay;

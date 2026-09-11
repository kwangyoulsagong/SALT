import { ReactNode } from "react";
import { SavedWrapper } from "./SavedWrapper.css";

const Saved = ({ children }: { children: ReactNode }) => {
  return <div className={SavedWrapper}>{children}</div>;
};
export default Saved;

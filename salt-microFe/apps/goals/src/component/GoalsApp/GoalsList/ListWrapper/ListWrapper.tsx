import { ReactNode } from "react";
import { Wrapper } from "./ListWrapper.css";

const ListWrapper = ({ children }: { children: ReactNode }) => {
  return <article className={Wrapper}>{children}</article>;
};
export default ListWrapper;

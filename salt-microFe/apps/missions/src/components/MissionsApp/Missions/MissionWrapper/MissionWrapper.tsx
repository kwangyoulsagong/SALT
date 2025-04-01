import { ReactNode } from "react";
import { Wrapper } from "./MissionWrapper.css";

const MissionWrapper = ({ children }: { children: ReactNode }) => {
  return <article className={Wrapper}>{children}</article>;
};
export default MissionWrapper;

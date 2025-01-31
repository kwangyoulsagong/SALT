import { ReactNode } from "react";
import { Wrapper } from "./Missions.css";

const Missions = ({ children }: { children: ReactNode }) => {
  return <article className={Wrapper}>{children}</article>;
};
export default Missions;

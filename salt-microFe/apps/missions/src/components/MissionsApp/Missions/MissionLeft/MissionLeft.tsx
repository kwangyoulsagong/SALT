import { ReactNode } from "react";
import { Wrapper } from "./MissionLeft.css";

const MissionLeft = ({ children }: { children: ReactNode }) => {
  return <section className={Wrapper}>{children}</section>;
};
export default MissionLeft;

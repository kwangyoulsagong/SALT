import { ReactNode } from "react";
import { Wrapper } from "./GroupMisssion.css";

const GroupMissions = ({ children }: { children: ReactNode }) => {
  return <section className={Wrapper}>{children}</section>;
};
export default GroupMissions;

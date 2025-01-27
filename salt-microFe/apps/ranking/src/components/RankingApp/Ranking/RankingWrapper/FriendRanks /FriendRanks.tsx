import { ReactNode } from "react";
import { Wrapper } from "./FriendRanks.css";

const FriendRanks = ({ children }: { children: ReactNode }) => {
  return <section className={Wrapper}>{children}</section>;
};
export default FriendRanks;

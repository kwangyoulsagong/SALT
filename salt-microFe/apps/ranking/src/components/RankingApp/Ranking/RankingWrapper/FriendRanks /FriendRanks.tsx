import { ReactNode } from "react";
import { Wrapper } from "./FriendRanks.css";

const FriendRanks = ({ children }: { children: ReactNode }) => {
  return <article className={Wrapper}>{children}</article>;
};
export default FriendRanks;

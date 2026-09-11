import { ReactNode } from "react";
import { Card } from "./ProcessCard.css";

const ProcessCard = ({ children }: { children: ReactNode }) => {
  return <article className={Card}>{children}</article>;
};
export default ProcessCard;

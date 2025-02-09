import { ReactNode } from "react";
import { Container } from "./AddGoals.css";

const AddGoalsContainer = ({ children }: { children: ReactNode }) => {
  return <div className={Container}>{children}</div>;
};
export default AddGoalsContainer;

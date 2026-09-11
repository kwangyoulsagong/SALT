import { ReactNode } from "react";

import { Container } from "./GoalFieldSet.css";

export const GoalFieldSet = ({ children }: { children: ReactNode }) => {
  return <section className={Container}>{children}</section>;
};

export default GoalFieldSet;

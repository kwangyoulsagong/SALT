import { ReactNode } from "react";

import { Container } from "./AddGoalWrapper.css";

export const AddGoalWrapper = ({ children }: { children: ReactNode }) => {
  return <section className={Container}>{children}</section>;
};

export default AddGoalWrapper;

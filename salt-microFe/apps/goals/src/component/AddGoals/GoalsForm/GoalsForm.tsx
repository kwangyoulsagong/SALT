import { ReactNode } from "react";
import { Container } from "./GoalsForm.css";

const GoalsForm = ({ children }: { children: ReactNode }) => {
  return <section className={Container}>{children}</section>;
};
export default GoalsForm;

import { ReactNode } from "react";
import { Wrapper } from "./ServiceStepsWrapper.css";

const ServiceStepsWrapper = ({ children }: { children: ReactNode }) => {
  return <section className={Wrapper}>{children}</section>;
};
export default ServiceStepsWrapper;

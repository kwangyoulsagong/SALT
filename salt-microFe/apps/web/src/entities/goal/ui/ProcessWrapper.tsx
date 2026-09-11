import { ReactNode } from "react";

import { Wrapper } from "./ProcessWrapper.css";

export const ProcessWrapper = ({ children }: { children: ReactNode }) => {
  return <section className={Wrapper}>{children}</section>;
};

export default ProcessWrapper;

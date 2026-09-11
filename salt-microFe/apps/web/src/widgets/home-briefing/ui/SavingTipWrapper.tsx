import { ReactNode } from "react";

import { Wrapper } from "./SavingTipWrapper.css";

export const SavingTipWrapper = ({ children }: { children: ReactNode }) => {
  return <article className={Wrapper}>{children}</article>;
};

export default SavingTipWrapper;

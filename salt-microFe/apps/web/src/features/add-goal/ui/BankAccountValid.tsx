import { ReactNode } from "react";

import { Wrapper } from "./BankAccountValid.css";

/** 현재 사용처가 없다. 죽은 코드 판정은 F000(`FE-REQ-011`)이 한다. */
export const BankAccountValid = ({ children }: { children: ReactNode }) => {
  return <article className={Wrapper}>{children}</article>;
};

export default BankAccountValid;

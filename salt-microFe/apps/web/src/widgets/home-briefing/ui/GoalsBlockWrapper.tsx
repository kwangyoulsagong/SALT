import { ReactNode } from "react";

import { Container } from "./GoalsBlockWrapper.css";

/** 현재 사용처가 없다. 죽은 코드 판정은 F000(`FE-REQ-011`)이 한다. */
export const GoalsBlockWrapper = ({ children }: { children: ReactNode }) => {
  return <section className={Container}>{children}</section>;
};

export default GoalsBlockWrapper;

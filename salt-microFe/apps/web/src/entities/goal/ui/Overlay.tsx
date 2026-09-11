import { ReactNode } from "react";

import { Wrapper } from "./Overlay.css";

/** 현재 사용처가 없다. 죽은 코드 판정은 F000(`FE-REQ-011`)이 한다. */
export const Overlay = ({ children }: { children: ReactNode }) => {
  return <div className={Wrapper}>{children}</div>;
};

export default Overlay;

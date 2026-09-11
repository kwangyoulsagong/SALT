import { ReactNode } from "react";

import { Container } from "./Layout.css";

/** 모든 화면을 감싸는 폭·여백 셸. 라우트 레이아웃(`app/layout.tsx`)이 한 번만 건다. */
export const Layout = ({ children }: { children: ReactNode }) => {
  return <div className={Container}>{children}</div>;
};

export default Layout;

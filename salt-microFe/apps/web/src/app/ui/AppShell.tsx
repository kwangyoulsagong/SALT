import { ReactNode } from "react";

import { Container } from "./AppShell.css";

/**
 * 모든 화면을 감싸는 폭·여백 프레임.
 *
 * **`app` 레이어에 있는 이유:** 루트 `app/layout.tsx` 하나만 쓰고, 라우팅 파일은
 * `@/app` 과 `@/pages` 외에는 import 하지 않는다 (FR-25). 화면이 아니라 앱 껍데기다.
 */
export const AppShell = ({ children }: { children: ReactNode }) => {
  return <div className={Container}>{children}</div>;
};

export default AppShell;

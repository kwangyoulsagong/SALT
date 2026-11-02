import { ReactNode } from "react";

import { Container } from "./AppShell.css";
import { appContent } from "./NarrowScreenNotice.css";
import { NarrowScreenNotice } from "./NarrowScreenNotice";

/**
 * 모든 화면을 감싸는 폭·여백 프레임.
 *
 * **`app` 레이어에 있는 이유:** 루트 `app/layout.tsx` 하나만 쓰고, 라우팅 파일은
 * `@/app` 과 `@/pages` 외에는 import 하지 않는다 (FR-25). 화면이 아니라 앱 껍데기다.
 *
 * 폭이 768 미만이면 본문 대신 좁은 화면 안내를 보인다(`FE-REQ-043`) — CSS 로만 가르므로 본문도 렌더는 된다
 * (숨겨질 뿐). 휴대폰 화면은 앱이 맡는다.
 */
export const AppShell = ({ children }: { children: ReactNode }) => {
  return (
    <div className={Container}>
      {/* 모든 라우트의 main 랜드마크는 여기 하나다 — 페이지는 <main> 을 두지 않는다(중첩 금지). 좁은 화면에서는
          숨고 안내가 main 이 된다(axe landmark-one-main) */}
      <main className={appContent}>{children}</main>
      <NarrowScreenNotice />
    </div>
  );
};

export default AppShell;

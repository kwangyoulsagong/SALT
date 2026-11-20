import type { AppTabId } from "@repo/core/navigation";

import { DesktopViewLink } from "./DesktopViewLink";
import { MOBILE_MESSAGES } from "./messages";
import { MOBILE_TABS } from "./mobileTabs";
import { body, linkRow, screenTitle } from "./MobileShell.css";

/**
 * 탭 화면 자리(`FE-REQ-071` — 틀만). 화면은 F019 순서 2 가 도메인 패키지 `mobile` 진입점으로 옮겨 와 이 자리를 바꾼다.
 * 그때까지 대응표(`MOBILE_REDIRECTS`)에 탭 경로를 넣지 않는다 — 데스크톱 링크가 이 한 장으로 오지 않게.
 */
export const MobilePendingPage = ({ tab }: { tab: AppTabId }) => {
  const item = MOBILE_TABS.find((t) => t.id === tab);
  if (!item) return null;
  return (
    <div>
      <h1 className={screenTitle}>{item.label}</h1>
      <p className={body}>{MOBILE_MESSAGES.pendingBody}</p>
      <div className={linkRow}>
        <DesktopViewLink to={item.href} />
      </div>
    </div>
  );
};

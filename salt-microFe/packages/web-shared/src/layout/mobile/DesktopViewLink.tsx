import { MOBILE_PATHS } from "@repo/core/mobile";

import { MOBILE_MESSAGES } from "./messages";
import { desktopLink } from "./MobileShell.css";

/**
 * "데스크톱 화면으로 보기"(`FE-REQ-071` FR-7) — `/m/desktop` 이 `view=desktop` 쿠키를 달고 데스크톱 주소로 보낸다.
 * zone 을 넘으므로 `<a>`(문서 이동). 그 뒤로는 휴대폰이어도 `/m` 으로 보내지 않는다 — `/m` 문서로 다시 오면 쿠키를 지운다.
 */
export const DesktopViewLink = ({ to }: { to: string }) => (
  <a className={desktopLink} href={`${MOBILE_PATHS.desktop}?to=${encodeURIComponent(to)}`}>
    {MOBILE_MESSAGES.desktopView}
  </a>
);

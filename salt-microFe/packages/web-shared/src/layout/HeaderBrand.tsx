import { APP_TABS } from "@repo/core/navigation";
import { Logo } from "@repo/ui/logo";

import { ZoneLink } from "../ui";
import { full, link, symbol } from "./HeaderBrand.css";
import { NAVIGATION_FRAME_MESSAGES } from "./messages";

const HOME_HREF = APP_TABS.find((tab) => tab.id === "home")?.href ?? "/home";

/**
 * 머리 첫 칸 로고 (`FE-REQ-051` FR-2) — 누르면 홈. 링크 이름은 "SALT 홈", 그림은 화면 리더에서 뺀다.
 * 홈은 셸 zone 이라 도메인 zone 에서는 문서 이동(`ZoneLink` 가 레지스트리로 고른다).
 */
export const HeaderBrand = () => (
  <ZoneLink href={HOME_HREF} className={link} aria-label={NAVIGATION_FRAME_MESSAGES.brandHomeLabel}>
    <Logo className={full} size="md" decorative />
    <Logo className={symbol} variant="symbol" size="md" decorative />
  </ZoneLink>
);

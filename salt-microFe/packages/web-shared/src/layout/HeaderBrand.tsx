import { APP_TABS } from "@repo/core/navigation";
import { Logo } from "@repo/ui/logo";

import { AppTabLink } from "./AppTabLink";
import { full, link, symbol } from "./HeaderBrand.css";
import { NAVIGATION_FRAME_MESSAGES } from "./messages";

const HOME_TAB = APP_TABS.find((tab) => tab.id === "home");

/**
 * 머리 첫 칸 로고 (`FE-REQ-051` FR-2) — 누르면 홈. 링크 이름은 "SALT 홈", 그림은 화면 리더에서 뺀다.
 * 링크는 홈 탭과 같은 `AppTabLink` — 도메인 zone 에서 홈 탭과 똑같이 미리 그리고(prerender) · 계측하고 · 대기 문구를 끈다.
 */
export const HeaderBrand = () =>
  HOME_TAB ? (
    <AppTabLink tab={HOME_TAB} className={link} aria-label={NAVIGATION_FRAME_MESSAGES.brandHomeLabel}>
      <Logo className={full} size="md" decorative />
      <Logo className={symbol} variant="symbol" size="md" decorative />
    </AppTabLink>
  ) : null;

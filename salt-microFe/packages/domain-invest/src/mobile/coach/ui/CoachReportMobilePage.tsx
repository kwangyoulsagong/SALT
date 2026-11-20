import { MOBILE_ROUTES } from "@repo/core/mobile";
import { MobileHead, MobileScreen } from "@repo/web-shared/layout/mobile";

import { COACH_REPORT_MOBILE as M } from "../model/messages";
import { CoachReportMobile } from "./CoachReportMobile";

/** 휴대폰 코치 리포트 `/m/coach/report`(`FE-REQ-072` FR-3) — 투자 탭 안 push 화면. 뒤로는 투자 탭 */
export const CoachReportMobilePage = () => (
  <MobileScreen>
    <MobileHead title={M.title} back={{ href: MOBILE_ROUTES.investments, label: M.backTo }} />
    <CoachReportMobile />
  </MobileScreen>
);

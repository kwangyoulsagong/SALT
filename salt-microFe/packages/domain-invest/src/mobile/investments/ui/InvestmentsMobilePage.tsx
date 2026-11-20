import { ROUTES } from "@repo/web-shared/config";
import { BlockBoundary } from "@repo/web-shared/ui";
import { DesktopViewLink, MobileHead, MobileScreen } from "@repo/web-shared/layout/mobile";

import { INVESTMENTS_MOBILE as M } from "../model/messages";
import { InvestmentsMobile } from "./InvestmentsMobile";
import * as s from "./investmentsMobile.css";

/** 휴대폰 투자 탭 `/m/investments`(`FE-REQ-072` FR-3) — 서버 셸. 관심 종목은 로그인 세션 쿼리라 브라우저가 부른다(데스크톱 사이드와 같은 조회) */
export const InvestmentsMobilePage = () => (
  <MobileScreen>
    <MobileHead title={M.title} />
    <BlockBoundary name={M.blockName} minHeight={320}>
      <InvestmentsMobile />
    </BlockBoundary>
    <div>
      <p className={s.note}>{M.board}</p>
      <DesktopViewLink to={ROUTES.investments} />
    </div>
  </MobileScreen>
);

import { ROUTES } from "@repo/web-shared/config";
import { BackNav, PageFrame } from "@repo/web-shared/ui/frame";
import { panelDescription, panelTitle } from "@repo/web-shared/ui/surface.css";

import {
  RECURRING_MESSAGES as R,
  TemplateList,
} from "@/features/manage-recurring";

import { HOUSEHOLD_TRAIL } from "@/entities/household";
import { RECURRING_PAGE as M } from "../model";

/** 매달 나가는 돈 `/household/templates`(`FE-REQ-057` FR-4, 가계부 S1b) — 서버 셸 + 목록 잎 */
export const RecurringPage = () => (
  <PageFrame surface="cards">
    <BackNav
      label={M.back}
      trailLabel={HOUSEHOLD_TRAIL.label}
      fallbackHref={ROUTES.household}
      crumbs={[
        { label: HOUSEHOLD_TRAIL.household, href: ROUTES.household },
        { label: R.title },
      ]}
    />
    <h1 className={panelTitle}>{R.title}</h1>
    <p className={panelDescription}>{R.description}</p>
    <TemplateList />
  </PageFrame>
);

export default RecurringPage;

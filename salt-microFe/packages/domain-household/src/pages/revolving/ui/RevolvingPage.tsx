import { ROUTES } from "@repo/web-shared/config";
import { BlockBoundary } from "@repo/web-shared/ui";
import { BackNav, PageFrame } from "@repo/web-shared/ui/frame";
import { panelDescription, panelTitle } from "@repo/web-shared/ui/surface.css";

import { HOUSEHOLD_TRAIL } from "@/entities/household";
import { REVOLVING_PAGE as M } from "../model";
import { RevolvingBoard } from "./RevolvingBoard";

/** 리볼빙 `/household/revolving`(`FE-REQ-057` FR-7, 가계부 S1h) — 서버 셸 + 명세서 잎 */
export const RevolvingPage = () => (
  <PageFrame>
    <BackNav
      label={M.back}
      trailLabel={HOUSEHOLD_TRAIL.label}
      fallbackHref={ROUTES.household}
      crumbs={[
        { label: HOUSEHOLD_TRAIL.household, href: ROUTES.household },
        { label: M.title },
      ]}
    />
    <h1 className={panelTitle}>{M.title}</h1>
    <p className={panelDescription}>{M.description}</p>
    <BlockBoundary name={M.blockName} minHeight={320}>
      <RevolvingBoard />
    </BlockBoundary>
  </PageFrame>
);

export default RevolvingPage;

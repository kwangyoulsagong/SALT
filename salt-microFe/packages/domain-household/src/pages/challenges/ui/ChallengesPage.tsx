import { ROUTES } from "@repo/web-shared/config";
import { BlockBoundary } from "@repo/web-shared/ui";
import { BackNav, PageFrame } from "@repo/web-shared/ui/frame";
import { panelDescription, panelTitle } from "@repo/web-shared/ui/surface.css";

import { HOUSEHOLD_TRAIL } from "@/entities/household";
import { CHALLENGES_PAGE as M } from "../model";
import { ChallengeBoard } from "./ChallengeBoard";

/** 챌린지 `/household/challenges`(`FE-REQ-057` FR-9, 가계부 S1d) — 서버 셸 + 목록 잎 */
export const ChallengesPage = () => (
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
      <ChallengeBoard />
    </BlockBoundary>
  </PageFrame>
);

export default ChallengesPage;

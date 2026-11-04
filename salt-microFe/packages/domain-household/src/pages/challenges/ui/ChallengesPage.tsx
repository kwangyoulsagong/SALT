import Link from "next/link";

import { ROUTES } from "@repo/web-shared/config";
import { BlockBoundary } from "@repo/web-shared/ui";
import { backLink, panelDescription, panelTitle } from "@repo/web-shared/ui/surface.css";

import { CHALLENGES_PAGE as M } from "../model";
import { ChallengeBoard } from "./ChallengeBoard";
import * as s from "./challenges.css";

/** 챌린지 `/household/challenges`(`FE-REQ-057` FR-9, 가계부 S1d) — 서버 셸 + 목록 잎 */
export const ChallengesPage = () => (
  <div className={s.page}>
    <Link href={ROUTES.household} className={backLink}>
      {M.back}
    </Link>
    <h1 className={panelTitle}>{M.title}</h1>
    <p className={panelDescription}>{M.description}</p>
    <BlockBoundary name={M.blockName} minHeight={320}>
      <ChallengeBoard />
    </BlockBoundary>
  </div>
);

export default ChallengesPage;

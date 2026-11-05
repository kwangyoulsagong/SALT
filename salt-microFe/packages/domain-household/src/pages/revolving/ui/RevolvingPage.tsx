import Link from "next/link";

import { ROUTES } from "@repo/web-shared/config";
import { BlockBoundary } from "@repo/web-shared/ui";
import { backLink, panelDescription, panelTitle } from "@repo/web-shared/ui/surface.css";

import { REVOLVING_PAGE as M } from "../model";
import { RevolvingBoard } from "./RevolvingBoard";
import * as s from "./revolving.css";

/** 리볼빙 `/household/revolving`(`FE-REQ-057` FR-7, 가계부 S1h) — 서버 셸 + 명세서 잎 */
export const RevolvingPage = () => (
  <div className={s.page}>
    <Link href={ROUTES.household} className={backLink}>
      {M.back}
    </Link>
    <h1 className={panelTitle}>{M.title}</h1>
    <p className={panelDescription}>{M.description}</p>
    <BlockBoundary name={M.blockName} minHeight={320}>
      <RevolvingBoard />
    </BlockBoundary>
  </div>
);

export default RevolvingPage;

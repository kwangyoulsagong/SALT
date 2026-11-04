import Link from "next/link";

import { ROUTES } from "@repo/web-shared/config";
import { backLink, panelDescription, panelTitle } from "@repo/web-shared/ui/surface.css";

import { RECURRING_MESSAGES as R, TemplateList } from "@/features/manage-recurring";

import { RECURRING_PAGE as M } from "../model";
import * as s from "./recurring.css";

/** 매달 나가는 돈 `/household/templates`(`FE-REQ-057` FR-4, 가계부 S1b) — 서버 셸 + 목록 잎 */
export const RecurringPage = () => (
  <div className={s.page}>
    <Link href={ROUTES.household} className={backLink}>
      {M.back}
    </Link>
    <h1 className={panelTitle}>{R.title}</h1>
    <p className={panelDescription}>{R.description}</p>
    <TemplateList />
  </div>
);

export default RecurringPage;

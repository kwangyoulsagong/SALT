import Link from "next/link";

import { ROUTES } from "@repo/web-shared/config";
import { backLink, panelTitle } from "@repo/web-shared/ui/surface.css";

import { BUDGET_PAGE as M } from "../model";
import { BudgetBoard } from "./BudgetBoard";
import * as s from "./budget.css";

/** 예산 `/household/budget`(`FE-REQ-057` FR-6) */
export const BudgetPage = () => (
  <div className={s.page}>
    <Link href={ROUTES.household} className={backLink}>
      {M.back}
    </Link>
    <h1 className={panelTitle}>{M.title}</h1>
    <BudgetBoard />
  </div>
);

export default BudgetPage;

import Link from "next/link";

import { ROUTES } from "@repo/web-shared/config";
import { backLink, panelTitle } from "@repo/web-shared/ui/surface.css";

import { NEW_EXPENSE_PAGE as M } from "../model";
import { NewExpenseModes } from "./NewExpenseModes";
import * as s from "./newExpense.css";

/** 지출 적기 `/household/new` — 서버 셸 + 입력 잎 */
export const NewExpensePage = () => (
  <div className={s.page}>
    <Link href={ROUTES.household} className={backLink}>
      {M.back}
    </Link>
    <h1 className={panelTitle}>{M.title}</h1>
    <NewExpenseModes />
  </div>
);

export default NewExpensePage;

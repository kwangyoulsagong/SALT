import Link from "next/link";

import { ROUTES } from "@repo/web-shared/config";
import { backLink, panelTitle } from "@repo/web-shared/ui/surface.css";

import { AddGoalForm } from "@/features/add-goal";

import { ADD_GOAL_PAGE } from "../model";
import * as s from "./addGoalPage.css";

/** 목표 만들기 `/goals/new` — 템플릿 · 계산기(`FE-REQ-056` FR-2 · 3). 계산은 서버 */
export const AddGoalPage = () => (
  <div className={s.page}>
    <Link href={ROUTES.goals} className={backLink}>
      {ADD_GOAL_PAGE.back}
    </Link>
    <h1 className={panelTitle}>{ADD_GOAL_PAGE.title}</h1>
    <AddGoalForm />
  </div>
);

export default AddGoalPage;

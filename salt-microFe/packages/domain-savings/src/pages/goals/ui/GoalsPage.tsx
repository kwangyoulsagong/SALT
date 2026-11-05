import Link from "next/link";

import { ROUTES } from "@repo/web-shared/config";
import { BlockBoundary, TimelyTip, TimelyTipContext } from "@repo/web-shared/ui";
import { panelDescription, panelTitle } from "@repo/web-shared/ui/surface.css";

import { serverGoals } from "../api";
import { GOALS_PAGE } from "../model";
import { GoalsBoard } from "./GoalsBoard";
import * as s from "./goals.css";

/** 저축 목표 목록 `/goals` — 서버 컴포넌트 셸 + 목록 잎(`FE-REQ-056` FR-1). 같은 zone 안 이동은 `<Link>` */
export const GoalsPage = async () => {
  const initialGoals = await serverGoals();
  return (
    <div className={s.page}>
      <div className={s.head}>
        <h1 className={panelTitle}>{GOALS_PAGE.title}</h1>
        <Link href={ROUTES.addGoal} className={s.addLink}>
          {GOALS_PAGE.add}
        </Link>
      </div>
      <p className={panelDescription}>{GOALS_PAGE.description}</p>
      {/* 때맞춘 팁 0~1장 — 결혼 · 주거 목표를 만들면 붙는 제도 한 줄(FE-REQ-058 FR-6). 무엇을 띄울지는 서버 */}
      <TimelyTip context={TimelyTipContext.Savings} />
      <BlockBoundary name={GOALS_PAGE.blockName} minHeight={160}>
        <GoalsBoard initialGoals={initialGoals} />
      </BlockBoundary>
    </div>
  );
};

export default GoalsPage;

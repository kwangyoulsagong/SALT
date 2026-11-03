import Link from "next/link";

import { ROUTES } from "@repo/web-shared/config";
import { BlockBoundary } from "@repo/web-shared/ui";
import { backLink } from "@repo/web-shared/ui/surface.css";

import { serverGoal } from "../api";
import { GOAL_DETAIL_PAGE as M } from "../model";
import { GoalDetailView } from "./GoalDetailView";
import * as s from "./goalDetail.css";

/** 목표 상세 `/goals/[id]` — 서버 셸 + 상세 잎(`FE-REQ-056`). 라우트 파라미터 해석까지만 */
export const GoalDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const initial = await serverGoal(id);
  return (
    <div className={s.page}>
      <Link href={ROUTES.goals} className={backLink}>
        {M.back}
      </Link>
      <BlockBoundary name={M.blockName} minHeight={320}>
        <GoalDetailView goalId={id} initial={initial} />
      </BlockBoundary>
    </div>
  );
};

export default GoalDetailPage;

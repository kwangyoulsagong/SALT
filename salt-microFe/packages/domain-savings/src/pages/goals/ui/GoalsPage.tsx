import Link from "next/link";

import { ROUTES } from "@repo/web-shared/config";
import { BlockBoundary, PageFrame } from "@repo/web-shared/ui";

import { serverGoals, serverOverview } from "../api";
import { GOALS_PAGE as M } from "../model";
import { GoalsBoard } from "./GoalsBoard";
import { GoalsSide } from "./GoalsSide";
import * as s from "./goals.css";

/**
 * 저축 목표 `/goals`(`FE-REQ-056` FR-1 → `FE-REQ-060` FR-1 · 2 · 8 데스크톱 틀). 서버 셸 — 목록 · 요약 띠 첫 숫자를 병렬로 받아 본문 · 사이드에 같이 넘긴다
 * (사이드는 같은 목록 조회 키라 요청은 한 번). 머리 = 제목 + 새 목표, 사이드 = 나눠 넣기 · 저울 · 엽서 보관함
 */
export const GoalsPage = async () => {
  const [initialGoals, initialOverview] = await Promise.all([serverGoals(), serverOverview()]);
  return (
    <PageFrame
      title={M.title}
      actions={
        <Link href={ROUTES.addGoal} className={s.addLink}>
          {M.add}
        </Link>
      }
      side={<GoalsSide initialGoals={initialGoals} />}
      sideLabel={M.tools}
      surface="cards"
    >
      <BlockBoundary name={M.blockName} minHeight={480}>
        <GoalsBoard initialGoals={initialGoals} initialOverview={initialOverview} />
      </BlockBoundary>
    </PageFrame>
  );
};

export default GoalsPage;

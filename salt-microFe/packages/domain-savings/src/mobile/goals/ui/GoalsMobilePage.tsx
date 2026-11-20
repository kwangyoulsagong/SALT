import { BlockBoundary } from "@repo/web-shared/ui";
import { MobileHead, MobileScreen } from "@repo/web-shared/layout/mobile";

import { serverGoalsFirst } from "../api/server";
import { GOALS_MOBILE as M } from "../model/messages";
import { GoalsMobile } from "./GoalsMobile";

/**
 * 휴대폰 저축 탭 `/m/goals`(`FE-REQ-072` FR-1 · FR-2) — 서버 셸. 목록 · 요약 첫 숫자를 병렬로 받아 본문 잎에 넘긴다(데스크톱 `/goals` 와 같은 조회).
 * 데스크톱 화면(`pages/goals`)을 가져오지 않는다 — 같이 쓰는 것은 `entities/goal` · `widgets/goal-tools`
 */
export const GoalsMobilePage = async () => {
  const [initialGoals, initialOverview] = await serverGoalsFirst();
  return (
    <MobileScreen>
      <MobileHead title={M.title} />
      <BlockBoundary name={M.blockName} minHeight={480}>
        <GoalsMobile initialGoals={initialGoals} initialOverview={initialOverview} />
      </BlockBoundary>
    </MobileScreen>
  );
};

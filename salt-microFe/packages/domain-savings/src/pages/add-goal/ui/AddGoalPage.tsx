import { ROUTES } from "@repo/web-shared/config";
import { BackNav, PageFrame } from "@repo/web-shared/ui/frame";
import { panelTitle } from "@repo/web-shared/ui/surface.css";

import { AddGoalForm } from "@/features/add-goal";

import { ADD_GOAL_PAGE } from "../model";

/**
 * 목표 만들기 `/goals/new` — 템플릿 · 계산기(`FE-REQ-056` FR-2 · 3). 계산은 서버.
 * `?template=` — 목표 없음 화면에서 고른 템플릿으로 시작(2026-11-20 `FE-REQ-060` FR-14). 모르는 값이면 기본 템플릿.
 * 머리는 다른 하위 화면과 같은 뒤로 + 이동 경로(2026-11-20) · 본문은 입력 | 계산 결과 2단(`AddGoalForm`)
 */
export const AddGoalPage = async ({ searchParams }: { searchParams?: Promise<{ template?: string | string[] }> }) => {
  const params = (await searchParams) ?? {};
  const template = typeof params.template === "string" ? params.template : undefined;
  return (
    <PageFrame>
      <BackNav
        label={ADD_GOAL_PAGE.back}
        trailLabel={ADD_GOAL_PAGE.trailLabel}
        fallbackHref={ROUTES.goals}
        crumbs={[{ label: ADD_GOAL_PAGE.trailSavings, href: ROUTES.goals }, { label: ADD_GOAL_PAGE.title }]}
      />
      <h1 className={panelTitle}>{ADD_GOAL_PAGE.title}</h1>
      <AddGoalForm initialTemplate={template} />
    </PageFrame>
  );
};

export default AddGoalPage;

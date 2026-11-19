import { ROUTES } from "@repo/web-shared/config";
import { BackNav, PageFrame } from "@repo/web-shared/ui";
import { panelTitle } from "@repo/web-shared/ui/surface.css";

import { BUDGET_PAGE as M } from "../model";
import { BudgetBoard, BudgetSide } from "./BudgetBoard";

/**
 * 예산 `/household/budget`(`FE-REQ-057` FR-6 → `FE-REQ-060` FR-7) — 데스크톱 틀: 뒤로 + 이동 경로 · 본문 = 방식 · 봉투 행, 오른쪽 사이드 = 내 분류 · 근무 시간
 */
export const BudgetPage = () => (
  <PageFrame side={<BudgetSide />} sideLabel={M.side}>
    <BackNav
      label={M.back}
      trailLabel={M.trailLabel}
      fallbackHref={ROUTES.household}
      crumbs={[{ label: M.trailHousehold, href: ROUTES.household }, { label: M.title }]}
    />
    {/* 상세 화면과 같은 순서 — 뒤로 줄 → 제목(`FE-REQ-047` FR-10) */}
    <h1 className={panelTitle}>{M.title}</h1>
    <BudgetBoard />
  </PageFrame>
);

export default BudgetPage;

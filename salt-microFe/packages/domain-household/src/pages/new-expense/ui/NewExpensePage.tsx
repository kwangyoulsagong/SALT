import { ROUTES } from "@repo/web-shared/config";
import { BackNav, PageFrame } from "@repo/web-shared/ui/frame";
import { panelTitle } from "@repo/web-shared/ui/surface.css";

import { NEW_EXPENSE_PAGE as M } from "../model";
import { MonthGlance } from "./MonthGlance";
import { NewExpenseModes } from "./NewExpenseModes";
import { RecentExpenses } from "./RecentExpenses";
import * as s from "./newExpense.css";

/**
 * 지출 적기 `/household/new`(`FE-REQ-057` FR-2 · FR-3 → `FE-REQ-060` FR-6) — 한 줄 · 붙여넣기와 태블릿 · 앱 웹뷰의 입력 자리.
 * 데스크톱 틀: 뒤로 + 이동 경로 · 본문 = 방법 셋 · 오른쪽 사이드 = 이 달 최근 쓴 내역(방금 적은 것이 거기 보인다)
 */
export const NewExpensePage = () => (
  <PageFrame side={<RecentExpenses />} sideLabel={M.recent}>
    <BackNav
      label={M.back}
      trailLabel={M.trailLabel}
      fallbackHref={ROUTES.household}
      crumbs={[
        { label: M.trailHousehold, href: ROUTES.household },
        { label: M.title },
      ]}
    />
    <h1 className={panelTitle}>{M.title}</h1>
    {/* 폼 | 이번 달 지금까지(2026-11-20 — 폼 옆이 비어 있었다). 1280 미만은 위아래 */}
    <div className={s.split}>
      <div className={s.body}>
        <NewExpenseModes />
      </div>
      <MonthGlance />
    </div>
  </PageFrame>
);

export default NewExpensePage;

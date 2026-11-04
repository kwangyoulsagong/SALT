import Link from "next/link";
import { notFound } from "next/navigation";

import { ROUTES } from "@repo/web-shared/config";
import { BlockBoundary } from "@repo/web-shared/ui";
import { panelDescription, panelTitle } from "@repo/web-shared/ui/surface.css";

import { formatMonth } from "@/entities/household";

import { serverMonth } from "../api";
import { HOUSEHOLD_PAGE as M, currentMonth, isMonth, shiftMonth } from "../model";
import { HouseholdBoard } from "./HouseholdBoard";
import * as s from "./household.css";

const MonthView = async ({ ym }: { ym: string }) => {
  const initial = await serverMonth(ym);
  const thisMonth = currentMonth();
  return (
    <div className={s.page}>
      <div className={s.head}>
        <h1 className={panelTitle}>{M.title}</h1>
        <div className={s.actions}>
          <Link href={ROUTES.householdBudget} className={s.link}>
            {M.budget}
          </Link>
          <Link href={ROUTES.newExpense} className={s.link}>
            {M.add}
          </Link>
        </div>
      </div>
      <p className={panelDescription}>{M.description}</p>
      <nav className={s.monthNav} aria-label={M.current}>
        <Link href={ROUTES.householdMonth(shiftMonth(ym, -1))} className={s.link}>
          {M.prev}
        </Link>
        <span>{formatMonth(ym)}</span>
        {ym < thisMonth ? (
          <Link href={ym === shiftMonth(thisMonth, -1) ? ROUTES.household : ROUTES.householdMonth(shiftMonth(ym, 1))} className={s.link}>
            {M.next}
          </Link>
        ) : null}
      </nav>
      <BlockBoundary name={M.blockName} minHeight={240}>
        <HouseholdBoard ym={ym} initial={initial} />
      </BlockBoundary>
    </div>
  );
};

/** 가계부 `/household` — 이번 달(`FE-REQ-057` FR-1). 서버 셸 + 한 달 잎 */
export const HouseholdPage = async () => <MonthView ym={currentMonth()} />;

/** 지난 달 `/household/month/[ym]`(FR-7). 형식이 틀리거나 미래 달이면 404 */
export const HouseholdMonthPage = async ({ params }: { params: Promise<{ ym: string }> }) => {
  const { ym } = await params;
  if (!isMonth(ym) || ym > currentMonth()) notFound();
  return <MonthView ym={ym} />;
};

export default HouseholdPage;

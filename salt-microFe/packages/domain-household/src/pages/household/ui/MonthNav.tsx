import Link from "next/link";

import { ROUTES } from "@repo/web-shared/config";

import { formatMonth } from "@/entities/household";

import { HOUSEHOLD_PAGE as M, currentMonth, shiftMonth } from "../model";
import * as s from "./household.css";

/** 달 주소 — 이번 달은 `/household`, 지난 달은 `/household/month/[ym]`(FR-7 그대로) */
const monthHref = (ym: string, thisMonth: string) => (ym === thisMonth ? ROUTES.household : ROUTES.householdMonth(ym));

/**
 * 달 이동(`FE-REQ-060` FR-5 · H4) — `‹ 2026년 11월 ›` + "이번 달". 미래 달은 › 비활성(주소도 404). 서버 컴포넌트 — 링크만
 */
export const MonthNav = ({ ym }: { ym: string }) => {
  const thisMonth = currentMonth();
  const hasNext = ym < thisMonth;
  return (
    <nav className={s.monthNav} aria-label={M.monthNav}>
      <Link href={monthHref(shiftMonth(ym, -1), thisMonth)} className={s.navButton} aria-label={M.prev}>
        <span aria-hidden>‹</span>
      </Link>
      <span className={s.monthLabel} aria-current="date">
        {formatMonth(ym)}
      </span>
      {hasNext ? (
        <Link href={monthHref(shiftMonth(ym, 1), thisMonth)} className={s.navButton} aria-label={M.next}>
          <span aria-hidden>›</span>
        </Link>
      ) : (
        <span className={s.navDisabled} aria-hidden>
          ›
        </span>
      )}
      {ym !== thisMonth ? (
        <Link href={ROUTES.household} className={s.textButton}>
          {M.current}
        </Link>
      ) : null}
    </nav>
  );
};

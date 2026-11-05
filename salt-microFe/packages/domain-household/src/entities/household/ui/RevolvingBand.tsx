"use client";

import Link from "next/link";

import { ROUTES } from "@repo/web-shared/config";
import { NavChevron } from "@repo/web-shared/ui";

import { REVOLVING_MESSAGES as R, revolvingName, type HouseholdRevolvingBand } from "../model/ledger";
import { formatMonth, formatWon } from "../model/messages";
import * as s from "./expense.css";

/**
 * 리볼빙 띠(`FE-REQ-057` FR-7 · `SRV-REQ-046` FR-10, 가계부 S1h) — 이 달 추정 청구 줄 + 앞으로 6개월 합 + 추정이 지난 명세서.
 * 숫자는 전부 서버 값(원금 몫 · 수수료 · 이월 잔액). 할부 띠와 같은 회색 — 경고 색 · 지시 문구 0. 가정은 늘 함께 보인다.
 * 명세서가 하나도 없으면 띠 대신 적는 곳으로 가는 한 줄만.
 */
export const RevolvingBand = ({ revolving }: { revolving: HouseholdRevolvingBand }) => {
  const hasAny = revolving.lines.length > 0 || revolving.stale.length > 0;
  const manage = (
    <Link href={ROUTES.householdRevolving} className={s.navLink}>
      <span>{R.manage}</span>
      <NavChevron />
    </Link>
  );
  if (!hasAny) {
    return (
      <section className={s.box} aria-label={R.title}>
        <h2 className={s.title}>{R.title}</h2>
        {manage}
      </section>
    );
  }
  return (
    <section className={s.box} aria-label={R.title}>
      <div className={s.row}>
        <h2 className={s.title}>{R.title}</h2>
        {revolving.lines.length > 0 ? <span className={s.value}>{R.monthCharge(formatWon(revolving.monthCharge))}</span> : null}
      </div>
      {revolving.lines.length === 0 ? (
        <p className={s.note}>{R.empty}</p>
      ) : (
        <ul className={s.list}>
          {revolving.lines.map((l) => (
            <li key={l.plan.id} className={s.item}>
              <span className={s.itemMain}>
                <span className={s.itemTitle}>{revolvingName(l.plan)}</span>
                <span className={s.label}>{R.line(formatWon(l.charge.principal), formatWon(l.charge.fee))}</span>
              </span>
              <span className={s.itemMain}>
                <span className={s.value}>{formatWon(l.charge.total)}</span>
                <span className={s.label}>{R.balanceAfter(formatWon(l.charge.balanceAfter))}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {revolving.stale.map((p) => (
        <p key={p.id} className={s.note}>
          {R.stale(revolvingName(p), formatMonth(p.statementMonth))}
        </p>
      ))}
      {revolving.upcoming.some((u) => u.amount > 0) ? (
        <>
          <span className={s.label}>{R.upcoming}</span>
          <ul className={s.list}>
            {revolving.upcoming.map((u) => (
              <li key={u.month} className={s.row}>
                <span className={s.label}>{formatMonth(u.month)}</span>
                <span className={s.value}>{formatWon(u.amount)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <p className={s.note}>{R.note}</p>
      {manage}
    </section>
  );
};

"use client";

import Link from "next/link";

import { EmptyState } from "@repo/ui/emptyState";
import { Skeleton } from "@repo/ui/skeleton";

import { ROUTES } from "@repo/web-shared/config";
import { NavChevron } from "@repo/web-shared/ui";

import { formatFullDay, formatWon, usePeople } from "@/entities/household";
import { GiftForm, GiftList } from "@/features/record-gift";
import { OccasionEnvelopeEditor } from "@/features/set-occasion-envelope";

import { PEOPLE_PAGE as M, peopleHref } from "../model";
import * as s from "./people.css";

/**
 * 사람 장부 잎(가계부 S1h) — 왼쪽: 적기 + 해(또는 한 사람) 줄 목록, 오른쪽: 해 봉투 + 사람별 합(모든 해).
 * 합 · 남은 금액 · 해 범위는 서버 값. 해 · 사람 선택은 주소(`?year=` · `?person=`).
 */
export const PeopleBoard = ({ year, person }: { year: number | null; person: string | null }) => {
  const view = usePeople(year, person);
  if (view.isSignedOut) return <EmptyState title={M.signedOut} />;
  if (view.isError) return <EmptyState title={M.loadFailed} tone="error" />;
  if (!view.data) return <Skeleton height={320} />;
  const v = view.data;
  const base = ROUTES.householdPeople;
  return (
    <div className={s.grid}>
      <div className={s.column}>
        <GiftForm key={v.person ?? "_"} occasions={v.occasions} today={v.today} person={v.person} />
        {v.person ? (
          <>
            <div className={s.nav}>
              <h2 className={s.sectionTitle}>{M.personTitle(v.person)}</h2>
              <Link href={peopleHref(base, { year: v.year })} className={s.link}>
                {M.backToYear}
              </Link>
            </div>
            <span className={s.label}>
              {M.allYears} · {M.yearTotals(formatWon(v.gave), formatWon(v.received))}
            </span>
          </>
        ) : (
          <>
            <nav className={s.nav} aria-label={M.year(v.year)}>
              {v.year > v.yearMin ? (
                <Link href={peopleHref(base, { year: v.year - 1 })} className={s.link}>
                  {M.prevYear}
                </Link>
              ) : null}
              <span>{M.year(v.year)}</span>
              {v.year < v.yearMax ? (
                <Link href={peopleHref(base, { year: v.year + 1 })} className={s.link}>
                  {M.nextYear}
                </Link>
              ) : null}
            </nav>
            <span className={s.label}>{M.yearTotals(formatWon(v.gave), formatWon(v.received))}</span>
          </>
        )}
        <GiftList entries={v.entries} occasions={v.occasions} today={v.today} />
      </div>
      <div className={s.column}>
        {v.person ? null : <OccasionEnvelopeEditor key={`${v.year}-${v.envelope?.amount ?? "none"}`} year={v.year} envelope={v.envelope} />}
        <section aria-label={M.people}>
          <h2 className={s.sectionTitle}>{M.people}</h2>
          {v.people.length === 0 ? (
            <p className={s.note}>{M.peopleEmpty}</p>
          ) : (
            <ul className={s.list}>
              {v.people.map((p) => (
                <li key={p.person}>
                  <Link href={peopleHref(base, { person: p.person })} className={s.person}>
                    <span className={s.personMain}>
                      <span className={s.personName}>{p.person}</span>
                      <span className={s.label}>
                        {M.tally(formatWon(p.gave), formatWon(p.received), p.count)} · {M.lastOn(formatFullDay(p.lastOn))}
                      </span>
                    </span>
                    <NavChevron />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

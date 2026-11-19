"use client";

import Link from "next/link";

import { ROUTES } from "@repo/web-shared/config";
import { SideRow } from "@repo/web-shared/ui";

import { CategoryNamesProvider, CategoryRatio, EnvelopeRows, LandingBox, useHouseholdMonth, type HouseholdMonth } from "@/entities/household";
import { QuickEntryForm } from "@/features/record-expense";

import { HOUSEHOLD_PAGE as M } from "../model";
import * as s from "./household.css";

/** 가계부 도구 — 다른 화면으로 가는 줄(폭 100% · 셰브론). 1024 미만 · 앱 웹뷰는 본문 위 한 줄(`HouseholdBoard`) */
export const householdTools = (ym: string) => [
  { href: ROUTES.newExpense, label: M.add, hint: M.addHint },
  { href: ROUTES.householdBudget, label: M.budget, hint: M.budgetHint },
  { href: ROUTES.householdRecurring, label: M.recurring },
  { href: ROUTES.householdChallenges, label: M.challenges },
  { href: ROUTES.householdPeople, label: M.people },
  { href: ROUTES.householdStory(ym), label: M.story },
];

/**
 * 가계부 오른쪽 사이드(`FE-REQ-060` FR-4 · FR-6) — 바로 적기(이번 달만) → 봉투(행 44) → 분류별로 쓴 돈(가로 막대) → 착지 정보 상자(이번 달만 —
 * 구간 숫자는 요약 띠가 보이므로 여기선 설명만) → 가계부 도구. 본문과 같은 조회 키라 요청은 한 번
 */
export const HouseholdSide = ({ ym, initial }: { ym: string; initial: HouseholdMonth | null }) => {
  const month = useHouseholdMonth(ym, initial);
  const m = month.data;
  return (
    <>
      {m?.current ? (
        <section className={s.sideBlock} aria-labelledby="hh-quick">
          <h2 id="hh-quick" className={s.sideTitle}>
            {M.quickEntry}
          </h2>
          <QuickEntryForm compact />
        </section>
      ) : null}
      {m ? (
        <CategoryNamesProvider categories={m.categories}>
          <section className={s.sideBlock} aria-labelledby="hh-envelopes">
            <div className={s.sideHead}>
              <h2 id="hh-envelopes" className={s.sideTitle}>
                {M.envelopes}
              </h2>
              <Link href={ROUTES.householdBudget} className={s.sideLink}>
                {M.budget}
              </Link>
            </div>
            {m.budget ? <EnvelopeRows envelopes={m.envelopes} unbudgeted={m.unbudgeted} /> : <p className={s.hint}>{M.noBudget}</p>}
          </section>
          <section className={s.sideBlock} aria-labelledby="hh-ratio">
            <h2 id="hh-ratio" className={s.sideTitle}>
              {M.ratio}
            </h2>
            <CategoryRatio byCategory={m.byCategory} />
          </section>
          {m.current ? <LandingBox month={m} hideRange /> : null}
        </CategoryNamesProvider>
      ) : null}
      <section className={s.sideBlock} aria-labelledby="hh-tools">
        <h2 id="hh-tools" className={s.sideTitle}>
          {M.tools}
        </h2>
        <div>
          {householdTools(ym).map((tool) => (
            <SideRow key={tool.href} href={tool.href} icon={null} label={tool.label} hint={"hint" in tool ? tool.hint : undefined} />
          ))}
        </div>
      </section>
    </>
  );
};

"use client";

import Link from "next/link";

import { ROUTES } from "@repo/web-shared/config";
import { SideRow } from "@repo/web-shared/ui";

import { CategoryNamesProvider, EnvelopeRows, useHouseholdMonth, type HouseholdMonth } from "@/entities/household";
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
 * 가계부 오른쪽 사이드(`FE-REQ-060` FR-4 · FR-6 → 2026-11-20 개편) — 바로 적기(이번 달만) → 봉투(예산을 정했을 때만) → 가계부 도구(접힘).
 * 분류별로 쓴 돈은 본문 차트 칸으로, 착지 구간은 요약 띠가 보인다 — 칸을 쌓아 어지럽던 사이드를 두 덩어리로(리서치: 사이드는 블록 둘까지).
 * 본문과 같은 조회 키라 요청은 한 번
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
      {m?.budget ? (
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
            <EnvelopeRows envelopes={m.envelopes} unbudgeted={m.unbudgeted} />
          </section>
        </CategoryNamesProvider>
      ) : null}
      <details className={s.sideFold}>
        <summary className={s.sideFoldSummary}>{M.toolsFold}</summary>
        <div>
          {householdTools(ym).map((tool) => (
            <SideRow key={tool.href} href={tool.href} icon={null} label={tool.label} hint={"hint" in tool ? tool.hint : undefined} />
          ))}
        </div>
      </details>
    </>
  );
};

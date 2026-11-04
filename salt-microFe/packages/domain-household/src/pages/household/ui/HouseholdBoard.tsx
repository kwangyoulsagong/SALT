"use client";

import { EmptyState } from "@repo/ui/emptyState";
import { Skeleton } from "@repo/ui/skeleton";

import { panel, panelDescription, panelTitle } from "@repo/web-shared/ui/surface.css";

import {
  EXPENSE_MESSAGES as E,
  EnvelopeList,
  ExpenseList,
  FeelingMirror,
  InstallmentBand,
  LandingBox,
  MonthTotals,
  useHouseholdMonth,
  type HouseholdMonth,
} from "@/entities/household";
import { FeelingAskCard } from "@/features/answer-feeling";
import { MonthReview } from "@/features/close-month";
import { MarkableCalendar } from "@/features/mark-no-spend";
import { RecurringAskCard } from "@/features/manage-recurring";
import { DeleteExpenseButton } from "@/features/record-expense";

import { HOUSEHOLD_PAGE as M } from "../model";
import * as s from "./household.css";

/**
 * 한 달 화면 잎(`FE-REQ-057` FR-1 · FR-4 · FR-6 · FR-7 · FR-8 · FR-9) — 쓴 돈 · 반복 확인 · 다음 날 기분 · 착지 구간 · 봉투 · 할부 · 돌아보기 ·
 * 안 쓴 날 달력 · 기분별 만족 · 쓴 내역.
 * 숫자 · 보여 줄 단계(반복 `stage` · 닫을 수 있나 `closable`)는 전부 서버 값. 첫 숫자는 서버가 쿠키로 받아 넘긴다.
 */
export const HouseholdBoard = ({ ym, initial }: { ym: string; initial: HouseholdMonth | null }) => {
  const month = useHouseholdMonth(ym, initial);
  if (month.isSignedOut) return <EmptyState title={E.signedOut} />;
  if (month.isError) return <EmptyState title={E.loadFailed} tone="error" />;
  if (!month.data) return <Skeleton height={240} />;
  const m = month.data;
  return (
    <div className={s.grid}>
      <div className={s.column}>
        <MonthTotals month={m} />
        {m.current ? <RecurringAskCard items={m.recurring.items} /> : null}
        {m.current ? <FeelingAskCard ym={m.month} asks={m.feelings.asks} /> : null}
        {m.current ? <LandingBox month={m} /> : null}
        <section className={panel} aria-label={E.envelopes}>
          <h2 className={panelTitle}>{E.envelopes}</h2>
          {m.budget ? <EnvelopeList envelopes={m.envelopes} unbudgeted={m.unbudgeted} /> : <p className={panelDescription}>{E.noBudget}</p>}
        </section>
        <InstallmentBand installments={m.installments} />
        <MonthReview key={`${m.month}-${m.close?.closedAt ?? "open"}`} month={m} />
        <MarkableCalendar month={m} />
        <FeelingMirror mirror={m.feelings.mirror} />
      </div>
      <section className={panel} aria-label={E.list}>
        <h2 className={panelTitle}>{E.list}</h2>
        {m.expenses.length === 0 ? (
          <EmptyState title={M.emptyTitle} description={M.emptyDescription} />
        ) : (
          <ExpenseList expenses={m.expenses} action={(expense) => <DeleteExpenseButton expense={expense} />} />
        )}
      </section>
    </div>
  );
};

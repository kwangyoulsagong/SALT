"use client";

import { Button } from "@repo/ui/button";
import { SegmentedControl } from "@repo/ui/segmentedControl";
import { Skeleton } from "@repo/ui/skeleton";
import { StatusLine } from "@repo/ui/statusLine";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { MOBILE_PATHS } from "@repo/core/mobile";
import { ROUTES } from "@repo/web-shared/config";
import { todayInKorea } from "@repo/web-shared/lib";
import { DesktopViewLink, MobileSection, MobileSheetAction, MobileSummary } from "@repo/web-shared/layout/mobile";

import {
  BOARD_MESSAGES as B,
  CategoryNamesProvider,
  CategoryRatio,
  DayExpenseGroups,
  EnvelopeRows,
  EXPENSE_MESSAGES as E,
  ExpenseRow,
  HOUSEHOLD_SUMMARY_MESSAGES,
  formatWon,
  householdSummaryItems,
  resolveSelectedDay,
  SpendCalendar,
  useHouseholdMonth,
  type HouseholdMonth,
} from "@/entities/household";
import { FeelingAskCard } from "@/features/answer-feeling";
import { FixedCostCard } from "@/features/find-fixed-cost";
import { RecurringAskCard } from "@/features/manage-recurring";
import { MarkNoSpendButton } from "@/features/mark-no-spend";
import { DeleteExpenseButton, QuickEntryForm } from "@/features/record-expense";

import { HOUSEHOLD_MOBILE as M } from "../model/messages";
import * as s from "./householdMobile.css";

/** 세그먼트가 사는 주소 — `?view=`(없으면 목록). 고른 날은 `?day=` — 데스크톱과 같은 이름 */
const VIEW_PARAM = "view";
const DAY_PARAM = "day";
type View = keyof typeof M.views;
const VIEWS: readonly View[] = ["list", "calendar", "ratio", "envelopes"];
const readView = (raw: string | null): View => (VIEWS as readonly string[]).includes(raw ?? "") ? (raw as View) : "list";

/** 주소만 바꾼다(문서 이동 · 다시 부르기 0) — 뒤로가 세그먼트를 되돌리지 않게 replace */
const setParam = (key: string, value: string | null) => {
  const url = new URL(window.location.href);
  if (value === null) url.searchParams.delete(key);
  else url.searchParams.set(key, value);
  window.history.replaceState(null, "", url);
};

/**
 * 휴대폰 가계부 본문(`FE-REQ-072` FR-2 ← `FE-REQ-060` FR-M1) — 요약(쓴 돈 30 + 줄) → 확인할 것(반복 · 다음 날 기분 · 고정비) →
 * 세그먼트 넷(목록 · 달력 · 분류 · 봉투, 한 화면에 한 가지) → 하단 고정 "지출 적기" → 시트.
 * 데스크톱 `HouseholdBoard` 와 같은 조회 · 같은 칸 — 배치만 다르다. 숫자 · 보여 줄 단계는 전부 서버 값
 */
export const HouseholdMobile = ({ ym, initial }: { ym: string; initial: HouseholdMonth | null }) => {
  const month = useHouseholdMonth(ym, initial);
  const params = useSearchParams();
  const setView = useCallback((view: View) => setParam(VIEW_PARAM, view === "list" ? null : view), []);
  const selectDay = useCallback((date: string) => setParam(DAY_PARAM, date), []);

  if (month.isSignedOut) {
    return (
      <div className={s.status}>
        <StatusLine kind="blocked">{M.signedOut}</StatusLine>
        <Link href={MOBILE_PATHS.login} className={s.textLink}>
          {M.signIn}
        </Link>
      </div>
    );
  }
  if (month.isError && !month.data) {
    return (
      <div className={s.status}>
        <StatusLine kind="error">{E.loadFailed}</StatusLine>
        <Button size="md" variant="weak" onClick={() => void month.refetch()}>
          {M.retry}
        </Button>
      </div>
    );
  }
  if (!month.data) return <Skeleton height={480} />;
  const m = month.data;

  const view = readView(params?.get(VIEW_PARAM) ?? null);
  const selected = resolveSelectedDay(params?.get(DAY_PARAM) ?? null, m.calendar.days, todayInKorea(), m.current);
  const selectedDay = selected ? m.calendar.days.find((d) => d.date === selected) ?? null : null;
  const selectedExpenses = selected ? m.expenses.filter((e) => e.spentOn === selected) : [];

  return (
    <CategoryNamesProvider categories={m.categories}>
      <MobileSummary items={householdSummaryItems(m)} label={HOUSEHOLD_SUMMARY_MESSAGES.label} icon="household" />
      {m.current ? (
        <div className={s.asks}>
          <RecurringAskCard items={m.recurring.items} />
          <FeelingAskCard ym={m.month} asks={m.feelings.asks} />
          <FixedCostCard costs={m.fixedCosts} />
        </div>
      ) : null}
      <MobileSection title={M.list}>
        <SegmentedControl<View>
          label={M.viewLabel}
          value={view}
          onChange={setView}
          options={VIEWS.map((v) => ({ label: M.views[v], value: v }))}
        />
        {view === "list" ? (
          m.expenses.length === 0 ? (
            <p className={s.note}>{M.empty}</p>
          ) : (
            <DayExpenseGroups expenses={m.expenses} days={m.calendar.days} action={(expense) => <DeleteExpenseButton expense={expense} />} />
          )
        ) : view === "ratio" ? (
          <CategoryRatio byCategory={m.byCategory} />
        ) : view === "envelopes" ? (
          m.budget ? (
            <EnvelopeRows envelopes={m.envelopes} unbudgeted={m.unbudgeted} />
          ) : (
            <div className={s.status}>
              <p className={s.note}>{M.noBudget}</p>
              <DesktopViewLink to={ROUTES.householdBudget} />
            </div>
          )
        ) : (
          <div className={s.calendar}>
            <SpendCalendar days={m.calendar.days} selected={selected} onSelect={selectDay} />
            {selectedDay ? (
              <div key={selectedDay.date} className={s.day} aria-live="polite">
                <div className={s.dayHead}>
                  <span>{M.dayDetail(B.dayHead(selectedDay.date, B.weekday[selectedDay.weekday % 7]))}</span>
                  <span>{B.dayTotal(formatWon(selectedDay.spent))}</span>
                </div>
                {selectedExpenses.length === 0 ? (
                  <p className={s.note}>{B.dayEmpty}</p>
                ) : (
                  <ul className={s.dayRows}>
                    {selectedExpenses.map((e) => (
                      <ExpenseRow key={e.id} expense={e} />
                    ))}
                  </ul>
                )}
                {m.current ? <MarkNoSpendButton ym={m.month} day={selectedDay} /> : null}
              </div>
            ) : (
              <p className={s.note}>{B.calendarHint}</p>
            )}
          </div>
        )}
      </MobileSection>
      {/* 하단 고정 "지출 적기" → 바텀 시트(FR-M1 · M5) — 화면을 옮기지 않는다. 지난 달은 적지 않는다 */}
      {m.current ? (
        <MobileSheetAction label={M.add} title={M.add}>
          <QuickEntryForm />
        </MobileSheetAction>
      ) : null}
    </CategoryNamesProvider>
  );
};

"use client";

import { Button } from "@repo/ui/button";
import { Skeleton } from "@repo/ui/skeleton";
import { StatusLine } from "@repo/ui/statusLine";
import { SegmentedControl } from "@repo/ui/segmentedControl";
import { SummaryBand, type SummaryBandItem } from "@repo/ui/summaryBand";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { TimelyTip, TimelyTipContext } from "@repo/web-shared/ui";

import {
  BOARD_MESSAGES as B,
  CategoryNamesProvider,
  CategoryRatio,
  DailySpendBars,
  DayExpenseGroups,
  EXPENSE_MESSAGES as E,
  ExpenseRow,
  FeelingMirror,
  InstallmentBand,
  LANDING_MESSAGES as L,
  RevolvingBand,
  SpendCalendar,
  WORK_MESSAGES as W,
  formatWon,
  formatWorkMinutes,
  resolveSelectedDay,
  useHouseholdMonth,
  type HouseholdMonth,
} from "@/entities/household";
import { FeelingAskCard } from "@/features/answer-feeling";
import { MonthReview } from "@/features/close-month";
import { FixedCostCard } from "@/features/find-fixed-cost";
import { RecurringAskCard } from "@/features/manage-recurring";
import { MarkNoSpendButton } from "@/features/mark-no-spend";
import { DeleteExpenseButton } from "@/features/record-expense";
import { todayInKorea } from "@repo/web-shared/lib";

import { HOUSEHOLD_PAGE as M } from "../model";
import * as s from "./household.css";
import { HouseholdStart } from "./HouseholdStart";
import { householdTools } from "./HouseholdSide";

/** 고른 날이 사는 주소 — `?day=YYYY-MM-DD`(목록 + 미리보기 패턴: 선택은 주소에, `screen-desktop.md` §4) */
const DAY_PARAM = "day";
/** 목록 · 달력 전환이 사는 주소 — `?view=calendar`(리서치: 달력과 목록은 둘 다 펼치지 않고 전환). 없으면 목록 */
const VIEW_PARAM = "view";
type ListView = "list" | "calendar";

/** 요약 띠(`FE-REQ-060` FR-2) — 값 · 보일지 말지는 서버 값(없으면 그 칸을 안 그린다). 주인공은 쓴 돈 하나 */
const summaryItems = (m: HouseholdMonth): SummaryBandItem[] => {
  const spentHint = [
    E.count(m.totals.count),
    m.totals.approx > 0 ? `${E.exact} ${formatWon(m.totals.exact)} · ${E.approx} ${formatWon(m.totals.approx)}` : null,
    m.workHours ? W.total(formatWorkMinutes(m.workHours.totalMinutes)) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const items: SummaryBandItem[] = [
    { key: "spent", label: m.current ? E.spent : E.spentOf(m.month), value: formatWon(m.totals.total), hint: spentHint, hero: true },
  ];
  if (m.remaining !== null) items.push({ key: "remaining", label: E.remaining, value: formatWon(m.remaining) });
  if (m.dailyAvailable !== null && m.daysLeft !== null) {
    items.push({ key: "daily", label: E.dailyAvailable, value: formatWon(m.dailyAvailable), hint: E.daysLeft(m.daysLeft) });
  }
  if (m.current && m.landing) {
    const l = m.landing;
    const value =
      l.method === "month_over"
        ? L.monthOver
        : l.low !== null && l.high !== null
          ? M.landingRange(formatWon(l.low), formatWon(l.high))
          : M.landingShort;
    items.push({ key: "landing", label: M.landing, value });
  }
  return items;
};

/**
 * 한 달 화면 본문(`FE-REQ-060` FR-2 · FR-4 · FR-13) — 요약 띠 → 확인할 것(반복 · 다음 날 기분 · 고정비) → 쓴 내역(날짜 묶음) | 달력 + 고른 날 →
 * 이 달 더 보기(할부 · 리볼빙 · 돌아보기 · 기분별 만족). 봉투 · 분류 · 착지 · 바로 적기는 오른쪽 사이드.
 * 숫자 · 보여 줄 단계(반복 `stage` · 닫을 수 있나 `closable` · 누를 수 있는 날 `markable`)는 전부 서버 값
 */
export const HouseholdBoard = ({ ym, initial }: { ym: string; initial: HouseholdMonth | null }) => {
  const month = useHouseholdMonth(ym, initial);
  const params = useSearchParams();
  const selectDay = useCallback((date: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set(DAY_PARAM, date);
    window.history.replaceState(null, "", url);
  }, []);
  // 막대에서 날을 고르면 달력으로 — 그날 내역이 달력 옆에 열린다
  const openDay = useCallback((date: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set(DAY_PARAM, date);
    url.searchParams.set(VIEW_PARAM, "calendar");
    window.history.replaceState(null, "", url);
  }, []);
  const setView = useCallback((view: ListView) => {
    const url = new URL(window.location.href);
    if (view === "calendar") url.searchParams.set(VIEW_PARAM, view);
    else url.searchParams.delete(VIEW_PARAM);
    window.history.replaceState(null, "", url);
  }, []);

  // 상태는 패널 안 한 줄(`FE-REQ-060` FR-13) — 큰 빈 그림 · 빈 카드 0. 실패는 다시 불러오기 하나
  if (month.isSignedOut) return <StatusLine kind="blocked">{E.signedOut}</StatusLine>;
  if (month.isError && !month.data) {
    return (
      <div className={s.statusRow}>
        <StatusLine kind="error">{E.loadFailed}</StatusLine>
        <Button size="desk" variant="weak" onClick={() => void month.refetch()}>
          {M.retry}
        </Button>
      </div>
    );
  }
  if (!month.data) return <Skeleton height={480} />;
  const m = month.data;

  const fromUrl = params?.get(DAY_PARAM) ?? null;
  const selected = resolveSelectedDay(fromUrl, m.calendar.days, todayInKorea(), m.current);
  const selectedDay = selected ? m.calendar.days.find((d) => d.date === selected) ?? null : null;
  const selectedExpenses = selected ? m.expenses.filter((e) => e.spentOn === selected) : [];
  const dayHead = selectedDay ? B.dayHead(selectedDay.date, B.weekday[selectedDay.weekday % 7]) : "";
  const view: ListView = params?.get(VIEW_PARAM) === "calendar" ? "calendar" : "list";
  const empty = m.expenses.length === 0;
  const more = [
    m.installments.lines.length > 0 ? <InstallmentBand key="installments" installments={m.installments} /> : null,
    m.revolving.lines.length > 0 || m.revolving.stale.length > 0 ? <RevolvingBand key="revolving" revolving={m.revolving} /> : null,
    m.close || m.closable ? <MonthReview key={`review-${m.month}-${m.close?.closedAt ?? "open"}`} month={m} /> : null,
    m.feelings.mirror.length > 0 ? <FeelingMirror key="mirror" mirror={m.feelings.mirror} /> : null,
  ].filter((node) => node !== null);

  // 내 분류 이름은 월 화면이 이미 받은 표로(가계부 S1f) — 서버 HTML 부터 이름이 맞고 분류 표를 따로 부르지 않는다
  return (
    <CategoryNamesProvider categories={m.categories}>
      <div className={s.board}>
        <SummaryBand items={summaryItems(m)} label={M.summaryLabel} />
        <p className={s.description}>{M.description}</p>
        <div className={s.toolsInline}>
          {householdTools(ym).map((tool) => (
            <Link key={tool.href} href={tool.href} className={s.chipLink}>
              {tool.label}
            </Link>
          ))}
        </div>
        {/* 때맞춘 팁 0~1장 — 무엇을 띄울지는 서버(FE-REQ-058 FR-6) */}
        <TimelyTip context={TimelyTipContext.Household} />
        {m.current ? (
          <div className={s.asks}>
            <RecurringAskCard items={m.recurring.items} />
            <FeelingAskCard ym={m.month} asks={m.feelings.asks} />
            <FixedCostCard costs={m.fixedCosts} />
          </div>
        ) : null}
        {empty ? (
          <HouseholdStart current={m.current} />
        ) : (
          <>
            {/* 차트 두 칸(2026-11-20 개편) — 날마다 쓴 돈 · 분류별로 쓴 돈(사이드에서 옮김). 막대를 누르면 그날을 달력으로 연다 */}
            <div className={s.chartRow}>
              <section className={s.card} aria-labelledby="hh-daily">
                <div className={s.sectionHead}>
                  <h2 id="hh-daily" className={s.sectionTitle}>
                    {B.dailyTitle}
                  </h2>
                  <span className={s.hint}>{M.dailyHint}</span>
                </div>
                <DailySpendBars days={m.calendar.days} selected={view === "calendar" ? selected : null} onSelect={openDay} />
              </section>
              <section className={s.card} aria-labelledby="hh-ratio-main">
                <div className={s.sectionHead}>
                  <h2 id="hh-ratio-main" className={s.sectionTitle}>
                    {B.ratioTitle}
                  </h2>
                </div>
                <CategoryRatio byCategory={m.byCategory} />
              </section>
            </div>
            <section className={s.card} aria-labelledby="hh-list">
              <div className={s.sectionHead}>
                <h2 id="hh-list" className={s.sectionTitle}>
                  {M.list}
                </h2>
                <SegmentedControl<ListView>
                  label={M.viewLabel}
                  value={view}
                  onChange={setView}
                  options={[
                    { label: M.viewList, value: "list" },
                    { label: M.calendar, value: "calendar" },
                  ]}
                />
              </div>
              {view === "list" ? (
                <DayExpenseGroups expenses={m.expenses} days={m.calendar.days} action={(expense) => <DeleteExpenseButton expense={expense} />} />
              ) : (
                <div className={s.calendarSplit}>
                  <div>
                    <SpendCalendar days={m.calendar.days} selected={selected} onSelect={selectDay} />
                    <p className={s.hint}>{B.calendarHint}</p>
                  </div>
                  {selectedDay ? (
                    <div key={selectedDay.date} className={s.dayDetail} aria-live="polite">
                      <div className={s.dayHead}>
                        <span>{M.dayDetail(dayHead)}</span>
                        <span>{B.dayTotal(formatWon(selectedDay.spent))}</span>
                      </div>
                      {selectedExpenses.length === 0 ? (
                        <p className={s.hint}>{B.dayEmpty}</p>
                      ) : (
                        <ul className={s.dayRows}>
                          {selectedExpenses.map((e) => (
                            <ExpenseRow key={e.id} expense={e} />
                          ))}
                        </ul>
                      )}
                      {m.current ? <MarkNoSpendButton ym={m.month} day={selectedDay} /> : null}
                    </div>
                  ) : null}
                </div>
              )}
            </section>
          </>
        )}
        {/* 이 달 더 보기 — 내용이 있는 칸만(리서치: 데이터가 없으면 섹션을 접는다). 다 비면 섹션째 없음 */}
        {more.length > 0 ? (
          <section className={s.section} aria-labelledby="hh-more">
            <h2 id="hh-more" className={s.sectionTitle}>
              {M.more}
            </h2>
            <div className={s.moreGrid}>{more}</div>
          </section>
        ) : null}
      </div>
    </CategoryNamesProvider>
  );
};

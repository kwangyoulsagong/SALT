import type { SummaryBandItem } from "@repo/ui/summaryBand";

import { EXPENSE_MESSAGES as E, LANDING_MESSAGES as L, WORK_MESSAGES as W, formatWon, formatWorkMinutes } from "../model/messages";
import type { HouseholdMonth } from "../model/types";

/** 이 달 요약 칸 문구 — 데스크톱 띠(`/household`)와 휴대폰 요약(`/m/household`)이 같은 말 */
export const HOUSEHOLD_SUMMARY_MESSAGES = {
  label: "이 달 요약",
  landing: "이번 달 끝에는",
  /** 요약 칸에 들어가는 짧은 구간(설명 문장은 데스크톱 사이드 착지 상자) */
  landingRange: (low: string, high: string) => `${low} ~ ${high}`,
  landingShort: "기록이 14일 쌓이면 보여 드려요",
} as const;

const S = HOUSEHOLD_SUMMARY_MESSAGES;

/**
 * 이 달 요약 칸(`FE-REQ-060` FR-2 · `FE-REQ-072` FR-2) — 값 · 보일지 말지는 서버 값(없으면 그 칸을 안 그린다). 주인공은 쓴 돈 하나.
 * 데스크톱은 `SummaryBand` 타일, 휴대폰은 `MobileSummary` 큰 숫자 한 줄 — 같은 칸 · 같은 값
 */
export const householdSummaryItems = (m: HouseholdMonth): SummaryBandItem[] => {
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
          ? S.landingRange(formatWon(l.low), formatWon(l.high))
          : S.landingShort;
    items.push({ key: "landing", label: S.landing, value });
  }
  return items;
};

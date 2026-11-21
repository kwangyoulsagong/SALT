import type { OfflineSnapshot } from "@repo/core/mobile";
import { offlineRowsFromSummary } from "@repo/web-shared/lib";

import { HOUSEHOLD_SUMMARY_MESSAGES, categoryLabel, formatWon, householdSummaryItems, type HouseholdMonth } from "@/entities/household";

import { HOUSEHOLD_MOBILE as M } from "./messages";

/**
 * 가계부 한 벌(`FE-REQ-073` FR-1) — 화면이 보인 글자 그대로: 요약 칸 · 쓴 내역(쓴 곳 또는 분류 · 금액 · 날짜 · 분류). 서버 순서 그대로 앞에서 상한까지
 */
export const householdOfflineSnapshot = (m: HouseholdMonth): OfflineSnapshot => {
  const names = new Map(m.categories.flatMap((c) => (c.name === null ? [] : [[c.key, c.name] as const])));
  return {
    screen: "household",
    title: M.title,
    sections: [
      { title: HOUSEHOLD_SUMMARY_MESSAGES.label, rows: offlineRowsFromSummary(householdSummaryItems(m)) },
      {
        title: M.list,
        rows: m.expenses.map((e) => {
          const category = categoryLabel(e.category, names);
          return { label: e.merchant ?? category, value: formatWon(e.amount), sub: e.merchant ? `${e.spentOn} · ${category}` : e.spentOn };
        }),
      },
    ],
  };
};

import type { CalendarDay, HouseholdExpense } from "../model/types";

/**
 * 쓴 내역을 날짜로 묶는다(`FE-REQ-060` FR-4) — 날짜가 처음 나온 순서 그대로(서버가 최근을 앞에 준다), 묶음 안 순서도 그대로.
 * 금액은 만들지 않는다 — 묶음 합은 서버 달력 칸(`calendar.days[].spent`)
 */
export const groupExpensesByDay = (expenses: readonly HouseholdExpense[]): Array<{ date: string; items: HouseholdExpense[] }> => {
  const groups: Array<{ date: string; items: HouseholdExpense[] }> = [];
  const at = new Map<string, number>();
  for (const e of expenses) {
    const index = at.get(e.spentOn);
    if (index === undefined) {
      at.set(e.spentOn, groups.length);
      groups.push({ date: e.spentOn, items: [e] });
    } else {
      groups[index]!.items.push(e);
    }
  }
  return groups;
};

/**
 * 달력에서 고른 날(`?day=`) — 이 달의 미래가 아닌 날이면 그 날, 아니면(없음 · 다른 달 · 미래 · 형식 틀림) 이번 달이면 오늘, 지난 달이면 `null`
 */
export const resolveSelectedDay = (
  fromUrl: string | null,
  days: readonly Pick<CalendarDay, "date" | "state">[],
  today: string,
  current: boolean,
): string | null => {
  const pickable = (date: string | null) => (date !== null && days.some((d) => d.date === date && d.state !== "future") ? date : null);
  return pickable(fromUrl) ?? (current ? pickable(today) : null);
};

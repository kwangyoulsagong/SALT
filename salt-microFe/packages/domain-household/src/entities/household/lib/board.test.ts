import { describe, expect, it } from "vitest";

import type { HouseholdExpense } from "../model/types";
import { groupExpensesByDay, resolveSelectedDay } from "./board";

const e = (id: string, spentOn: string) => ({ id, spentOn }) as HouseholdExpense;

describe("groupExpensesByDay — 날짜 묶음", () => {
  it("날짜가 처음 나온 순서 · 묶음 안 순서를 지킨다", () => {
    const groups = groupExpensesByDay([e("a", "2026-11-19"), e("b", "2026-11-19"), e("c", "2026-11-16"), e("d", "2026-11-19")]);
    expect(groups.map((g) => [g.date, g.items.map((x) => x.id)])).toEqual([
      ["2026-11-19", ["a", "b", "d"]],
      ["2026-11-16", ["c"]],
    ]);
  });
  it("비면 묶음 0", () => {
    expect(groupExpensesByDay([])).toEqual([]);
  });
});

describe("resolveSelectedDay — 고른 날", () => {
  const days = [
    { date: "2026-11-18", state: "spent" as const },
    { date: "2026-11-19", state: "blank" as const },
    { date: "2026-11-20", state: "future" as const },
  ];
  it.each([
    ["주소의 날이 이 달 · 지난 날이면 그 날", "2026-11-18", true, "2026-11-18"],
    ["주소가 없으면 이번 달은 오늘", null, true, "2026-11-19"],
    ["미래 날은 고르지 않는다 — 오늘로", "2026-11-20", true, "2026-11-19"],
    ["다른 달 날은 오늘로", "2026-10-03", true, "2026-11-19"],
    ["형식이 틀리면 오늘로", "어제", true, "2026-11-19"],
    ["지난 달은 주소가 없으면 고르지 않는다", null, false, null],
    ["지난 달도 주소의 날은 그 날", "2026-11-18", false, "2026-11-18"],
  ] as const)("%s", (_, fromUrl, current, expected) => {
    expect(resolveSelectedDay(fromUrl, days, "2026-11-19", current)).toBe(expected);
  });
});

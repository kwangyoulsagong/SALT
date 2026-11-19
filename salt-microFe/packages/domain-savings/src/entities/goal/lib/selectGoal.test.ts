import { describe, expect, it } from "vitest";

import type { SavingsGoal } from "../model/types";
import { reachText } from "./reachText";
import { resolveSelectedGoal } from "./selectGoal";

const g = (id: string, status: SavingsGoal["status"]) => ({ id, status });

describe("resolveSelectedGoal — 미리보기 칸에 열 목표", () => {
  const goals = [g("done", "completed"), g("a", "active"), g("b", "active")];
  it.each([
    ["주소의 목표가 목록에 있다", "b", "b"],
    ["다 찬 목표도 주소에 있으면 연다", "done", "done"],
    ["주소가 없으면 첫 진행 중", null, "a"],
    ["주소가 목록에 없으면(지운 · 남의 목표) 첫 진행 중", "gone", "a"],
    ["빈 문자열은 없는 것", "", "a"],
  ])("%s", (_, fromUrl, expected) => {
    expect(resolveSelectedGoal(fromUrl, goals)).toBe(expected);
  });
  it("진행 중이 없으면 첫 목표", () => {
    expect(resolveSelectedGoal(null, [g("x", "completed"), g("y", "paused")])).toBe("x");
  });
  it("목록이 비면 null", () => {
    expect(resolveSelectedGoal("a", [])).toBeNull();
  });
});

describe("reachText — 도달 한 줄(한 점 날짜를 단정하지 않는다)", () => {
  const p = { earlyMonth: null, lateMonth: null, planMonth: null, reason: null } as const;
  it.each([
    ["구간", { ...p, earlyMonth: "2027-03", lateMonth: "2027-09", planMonth: "2027-05" }, "2027년 3월 ~ 2027년 9월"],
    ["이른 끝만", { ...p, earlyMonth: "2027-03" }, "빠르면 2027년 3월, 늦은 쪽은 정할 수 없어요"],
    ["계획만", { ...p, planMonth: "2027-05" }, "계획대로면 2027년 5월"],
    ["이유만", { ...p, reason: "no_plan" }, "월 계획이 없어 계산할 수 없어요"],
    ["모르는 이유", { ...p, reason: "new_reason" }, "—"],
  ])("%s", (_, input, expected) => {
    expect(reachText(input)).toBe(expected);
  });
});

describe("templateTag — 이름과 같은 템플릿 이름은 다시 쓰지 않는다", async () => {
  const { templateTag } = await import("../model/messages");
  it.each([
    ["이름이 템플릿 이름", { title: "비상금", template: "emergency" as const }, null],
    ["앞뒤 공백", { title: " 비상금 ", template: "emergency" as const }, null],
    ["다른 이름", { title: "결혼 자금", template: "wedding" as const }, "결혼"],
  ])("%s", (_, goal, expected) => {
    expect(templateTag(goal)).toBe(expected);
  });
});

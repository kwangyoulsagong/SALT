import { describe, expect, it } from "vitest";

import { COACH_MODE_LABEL, GOAL_TEMPLATE_LABEL, HOUSEHOLD_CATEGORY_LABEL, labelOf } from "./index";

/** 이름표 한 벌(2026-11-18 F006 알림) — 셸 알림 문장 · 도메인 화면이 같은 표를 읽는다. 모르는 코드는 원문을 내지 않는다 */
describe("labelOf", () => {
  it("아는 코드는 이름표", () => {
    expect(labelOf(GOAL_TEMPLATE_LABEL, "first_car")).toBe("첫 차");
    expect(labelOf(HOUSEHOLD_CATEGORY_LABEL, "housing")).toBe("주거 · 공과금");
    expect(labelOf(COACH_MODE_LABEL, "scalp")).toBe("단타");
  });

  it("모르는 코드 · 내 분류 · 없음 · 프로토타입 이름은 undefined", () => {
    expect(labelOf(HOUSEHOLD_CATEGORY_LABEL, "u_abc123def456")).toBeUndefined();
    expect(labelOf(COACH_MODE_LABEL, undefined)).toBeUndefined();
    expect(labelOf(GOAL_TEMPLATE_LABEL, "toString")).toBeUndefined();
    expect(labelOf(GOAL_TEMPLATE_LABEL, "")).toBeUndefined();
  });

  it("목표 틀은 저축 이벤트 계약의 일곱 값과 같다(contracts/events/savings.GoalReached.json)", () => {
    expect(Object.keys(GOAL_TEMPLATE_LABEL).sort()).toEqual(
      ["wedding", "housing", "first_car", "travel", "emergency", "childbirth", "other"].sort(),
    );
  });
});

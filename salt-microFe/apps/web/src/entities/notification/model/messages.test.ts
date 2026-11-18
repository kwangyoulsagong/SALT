import { describe, expect, it } from "vitest";

import { alertTextOf } from "./messages";

/**
 * 알림 문장(F006 `FE-REQ-031` FR-93 · `FEATURE-006` FR-53) — 코드 + 인자 → 제목 · 확인할 곳. 모르는 코드는 null(줄을 안 그린다).
 * 1회차 결함(종목 없는 판단 변화가 null → 목록에서 빠짐, 2026-11-18 실화면)을 경계로 둔다.
 */
describe("alertTextOf — 판단 변화", () => {
  it("종목 · 모드가 있으면 둘 다 · 종목 화면으로", () => {
    expect(alertTextOf("coach.decision_changed", { mode: "scalp" }, "005930")).toEqual({
      title: "005930 단타 판단이 바뀌었어요",
      hint: "종목 화면에서 바뀐 판단과 근거를 볼 수 있어요",
    });
  });

  it("종목이 인자에만 있어도 쓴다", () => {
    expect(alertTextOf("coach.decision_changed", { symbol: "KRW-BTC", mode: "long_term" }, null)?.title).toBe("KRW-BTC 장기 판단이 바뀌었어요");
  });

  it("종목이 없어도 줄을 그린다 — 코치 리포트로(1회차 결함)", () => {
    expect(alertTextOf("coach.decision_changed", { mode: "long_term" }, null)).toEqual({
      title: "코치 장기 판단이 바뀌었어요",
      hint: "코치 리포트에서 볼 수 있어요",
    });
  });

  it("모르는 모드는 이름을 빼고 원문 코드를 내지 않는다", () => {
    expect(alertTextOf("coach.decision_changed", { mode: "swing" }, "BTC")?.title).toBe("BTC 판단이 바뀌었어요");
    expect(alertTextOf("coach.decision_changed", {}, null)?.title).toBe("코치 판단이 바뀌었어요");
  });
});

describe("alertTextOf — 목표 · 고정비", () => {
  it("목표 틀 이름 · 기타와 모르는 틀은 '저축 목표'", () => {
    expect(alertTextOf("savings.goal_reached", { template: "first_car" }, null)?.title).toBe("첫 차 목표 금액에 닿았어요");
    expect(alertTextOf("savings.goal_reached", { template: "other" }, null)?.title).toBe("저축 목표 금액에 닿았어요");
    expect(alertTextOf("savings.goal_reached", { template: "yacht" }, null)?.title).toBe("저축 목표 금액에 닿았어요");
  });

  it("기본 분류 이름 · 내 분류(u_…) · 기타는 분류 없이", () => {
    expect(alertTextOf("household.fixed_cost_increased", { category: "telecom" }, null)?.title).toBe("통신 고정비가 지난번보다 올랐어요");
    expect(alertTextOf("household.fixed_cost_increased", { category: "u_abc123def456" }, null)?.title).toBe("고정비가 지난번보다 올랐어요");
    expect(alertTextOf("household.fixed_cost_increased", { category: "other" }, null)?.title).toBe("고정비가 지난번보다 올랐어요");
  });
});

describe("alertTextOf — 모르는 코드", () => {
  it("모르는 코드 · 프로토타입 이름은 null", () => {
    expect(alertTextOf("coach.some_future_code", {}, "BTC")).toBeNull();
    expect(alertTextOf("toString", {}, null)).toBeNull();
    expect(alertTextOf("constructor", {}, null)).toBeNull();
    expect(alertTextOf("", {}, null)).toBeNull();
  });

  it("문장에 숫자 · 금액이 생기지 않는다 — 종목 코드 말고는 인자 값을 그대로 옮기지 않는다", () => {
    const texts = [
      alertTextOf("savings.goal_reached", { template: "1000000" }, null),
      alertTextOf("household.fixed_cost_increased", { category: "55,000원" }, null),
      alertTextOf("coach.decision_changed", { mode: "3.5%" }, null),
    ];
    for (const t of texts) expect(`${t?.title} ${t?.hint}`).not.toMatch(/\d/);
  });
});

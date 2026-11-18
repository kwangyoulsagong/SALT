import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toAlertViewModels, toNextPage, type ServerNotificationItem } from "../alerts.viewmodel";

const item = (overrides: Partial<ServerNotificationItem> = {}): ServerNotificationItem => ({
  id: "n1",
  kind: "signal_update",
  symbol: "BTC",
  messageCode: "coach.decision_changed",
  params: { symbol: "BTC", previousAction: "HOLD", nextAction: "WATCH" },
  isRead: false,
  createdAt: "2026-10-28T01:00:00.000Z",
  ...overrides,
});

describe("toAlertViewModels (BFF-REQ-007 C절)", () => {
  it("도메인 종류 셋만 남기고 다른 종류는 오류 없이 버린다 (FR-20 · 21 · BFF-REQ-046 FR-8)", () => {
    const vms = toAlertViewModels([
      item(),
      item({ id: "g", kind: "goal_reached", symbol: null, messageCode: "savings.goal_reached", params: { template: "housing" } }),
      item({ id: "f", kind: "fixed_cost_increased", symbol: null, messageCode: "household.fixed_cost_increased", params: { category: "housing" } }),
      item({ id: "old", kind: "decision_change" }),
      item({ id: "tax", kind: "tax_deadline" }),
      item({ id: "nokind", kind: undefined }),
    ]);
    assert.deepEqual(vms.map((vm) => vm.id).sort(), ["f", "g", "n1"]);
  });

  it("금액 키 · 숫자 값 · 문자열이 아닌 인자를 지운다 (FR-22)", () => {
    const [vm] = toAlertViewModels([
      item({
        params: {
          symbol: "BTC",
          currentPrice: "x",
          totalKrw: "y",
          note: "158,000,000",
          rate: "-3.2%",
          raw: 158000000,
        },
      }),
    ]);
    assert.deepEqual(vm.params, { symbol: "BTC" });
  });

  it("종목 코드 칸 — 국내 숫자 코드는 남고 금액 모양은 지운다 · 다른 칸 숫자는 지운다 (SRV-REQ-048 FR-5)", () => {
    const keep = (symbol: string, extra: Record<string, unknown> = {}) =>
      toAlertViewModels([item({ params: { symbol, ...extra } })])[0].params;
    assert.deepEqual(keep("005930"), { symbol: "005930" });
    assert.deepEqual(keep("KRW-BTC"), { symbol: "KRW-BTC" });
    assert.deepEqual(keep("1,000"), {});
    assert.deepEqual(keep("3.5%"), {});
    assert.deepEqual(keep("BTC", { template: "005930" }), { symbol: "BTC" });
  });

  it("문장 없이 코드만 나간다 — 코드가 없는 행은 버린다 (FR-23)", () => {
    const vms = toAlertViewModels([
      item({ id: "legacy", messageCode: null }),
      item({ id: "ok" }),
    ]);
    assert.deepEqual(vms.map((vm) => vm.id), ["ok"]);
    assert.deepEqual(Object.keys(vms[0]).sort(), [
      "createdAt",
      "id",
      "isRead",
      "kind",
      "messageCode",
      "params",
      "symbol",
      "target",
    ]);
  });

  it("createdAt 내림차순 · 20건 (FR-24)", () => {
    const many = Array.from({ length: 25 }, (_, i) =>
      item({ id: `n${i}`, createdAt: new Date(Date.UTC(2026, 9, 1 + i)).toISOString() }),
    );
    const vms = toAlertViewModels(many);
    assert.equal(vms.length, 20);
    assert.equal(vms[0].id, "n24");
    assert.equal(vms[19].id, "n5");
  });

  it("갈 곳은 코드 — 종류마다 한 군데 · 종목 없는 판단 변화는 코치 리포트 · 경로 문자열 0 (BFF-REQ-028 FR-45)", () => {
    const vms = toAlertViewModels([
      item({ id: "s" }),
      item({ id: "s0", symbol: null, createdAt: "2026-10-28T00:59:00.000Z" }),
      item({ id: "g", kind: "goal_reached", symbol: null, messageCode: "savings.goal_reached", createdAt: "2026-10-28T00:58:00.000Z" }),
      item({ id: "f", kind: "fixed_cost_increased", symbol: null, messageCode: "household.fixed_cost_increased", createdAt: "2026-10-28T00:57:00.000Z" }),
    ]);
    assert.deepEqual(
      vms.map((vm) => [vm.id, vm.target]),
      [["s", "invest.symbol"], ["s0", "invest.coach"], ["g", "savings.goals"], ["f", "household.board"]],
    );
    assert.ok(vms.every((vm) => !vm.target.includes("/")));
  });
});

describe("toNextPage (BFF-REQ-027 FR-90)", () => {
  it("남은 행이 있을 때만 다음 쪽 · 모양이 틀리면 없음(끝없이 부르지 않는다)", () => {
    assert.equal(toNextPage(1, 20, 41), 2);
    assert.equal(toNextPage(2, 20, 41), 3);
    assert.equal(toNextPage(3, 20, 41), null);
    assert.equal(toNextPage(1, 20, 20), null);
    assert.equal(toNextPage(1, 0, 5), null);
    assert.equal(toNextPage(undefined, 20, 41), null);
    assert.equal(toNextPage("1", 20, 41), null);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toAlertViewModels, type ServerNotificationItem } from "../alerts.viewmodel";

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
  it("signal_update 만 남기고 다른 종류는 오류 없이 버린다 (FR-20 · 21)", () => {
    const vms = toAlertViewModels([
      item(),
      item({ id: "old", kind: "decision_change" }),
      item({ id: "tax", kind: "tax_deadline" }),
      item({ id: "nokind", kind: undefined }),
    ]);
    assert.deepEqual(vms.map((vm) => vm.id), ["n1"]);
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
});

import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { appSavingsService } from "../app-savings.service";
import { backendApi } from "../backend-api.service";

/** 저축 화면 계약 (`BFF-REQ-047`) — 숫자는 서버 그대로 · 경로는 `/savings/*`(라우팅 표가 platform 으로) */
describe("AppSavingsService", () => {
  afterEach(() => mock.restoreAll());

  it("목록 — 서버 data 를 가공 없이 돌려준다(수용 기준 1)", async () => {
    const goal = { id: "g", saved: 123456, progressPercent: 33.3, frame: "saved", milestone: { difference: -76544 } };
    const seen: string[] = [];
    mock.method(backendApi, "proxyAuthRequest", async (m: string, url: string) => {
      seen.push(`${m} ${url}`);
      return { data: { success: true, data: [goal] } } as never;
    });
    assert.deepEqual(await appSavingsService.goals("t"), [goal]);
    assert.deepEqual(seen, ["GET /savings/goals"]);
  });

  it("적립 · 나눠 넣기 · 만들기는 본문을 그대로 서버로 — 경로의 id 는 인코딩", async () => {
    const seen: Array<[string, string, unknown]> = [];
    mock.method(backendApi, "proxyAuthRequest", async (m: string, url: string, _t: string, body: unknown) => {
      seen.push([m, url, body]);
      return { data: { data: {} } } as never;
    });
    await appSavingsService.deposit("t", "a/b", { amount: 1000 });
    await appSavingsService.split("t", { total: 2, parts: [] });
    await appSavingsService.create("t", { title: "x" });
    assert.deepEqual(seen, [
      ["POST", "/savings/goals/a%2Fb/deposits", { amount: 1000 }],
      ["POST", "/savings/deposits/split", { total: 2, parts: [] }],
      ["POST", "/savings/goals", { title: "x" }],
    ]);
  });

  it("S1b — 저울 · 확정 · 비상시 · 단위: 경로 · 메서드 · 본문 그대로, 경로의 id 는 인코딩", async () => {
    const seen: Array<[string, string, unknown]> = [];
    mock.method(backendApi, "proxyAuthRequest", async (m: string, url: string, _t: string, body: unknown) => {
      seen.push([m, url, body]);
      return { data: { data: { ok: true } } } as never;
    });
    const changes = { changes: [{ goalId: "g", monthly: 200000 }] };
    assert.deepEqual(await appSavingsService.simulate("t", changes), { ok: true });
    await appSavingsService.updatePlans("t", changes);
    await appSavingsService.emergency("t", "a/b", { amount: 1, loanRate: 6, loanMonths: 12 });
    await appSavingsService.addUnit("t", "g", { name: "제주 왕복", unitPrice: 120000 });
    await appSavingsService.deleteUnit("t", "g", "u/1");
    assert.deepEqual(seen, [
      ["POST", "/savings/simulate", changes],
      ["PUT", "/savings/goals/plans", changes],
      ["POST", "/savings/goals/a%2Fb/emergency-compare", { amount: 1, loanRate: 6, loanMonths: 12 }],
      ["POST", "/savings/goals/g/units", { name: "제주 왕복", unitPrice: 120000 }],
      ["DELETE", "/savings/goals/g/units/u%2F1", undefined],
    ]);
  });
});

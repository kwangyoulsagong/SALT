import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { logger } from "../../config/logger";
import { appHouseholdService, GOAL_CLOCK_BUDGET_MS } from "../app-household.service";
import { backendApi } from "../backend-api.service";

/** 가계부 화면 계약 (`BFF-REQ-048`) — 숫자는 서버 그대로 · 목표 시계는 저축에서 붙이고 늦으면 pending · 원문은 로그 0 */
describe("AppHouseholdService", () => {
  afterEach(() => mock.restoreAll());

  const saved = { expenses: [{ id: "e", amount: 30000 }], savedTotal: 30000, envelope: { key: "cafe", budget: 10000, spent: 13000, remaining: -3000 }, monthTotal: 30000 };

  it("저장 — 서버 응답 그대로 + 목표 시계(저축 goal-clock 에 savedTotal 을 그대로)", async () => {
    const seen: string[] = [];
    mock.method(backendApi, "proxyAuthRequest", async (m: string, url: string) => {
      seen.push(`${m} ${url}`);
      if (url.startsWith("/savings/goal-clock")) {
        return { data: { data: { goalId: "g", title: "결혼", template: "wedding", delayDays: 3, reason: null } } } as never;
      }
      return { data: { data: saved } } as never;
    });
    const vm = await appHouseholdService.record("t", { amount: 30000, category: "food" });
    assert.deepEqual(seen, ["POST /household/expenses", "GET /savings/goal-clock?amount=30000"]);
    assert.equal(vm.envelope?.remaining, -3000);
    assert.deepEqual(vm.goalClock, { state: "ok", goalId: "g", title: "결혼", template: "wedding", delayDays: 3 });
  });

  it("목표가 없으면 none + 이유", async () => {
    mock.method(backendApi, "proxyAuthRequest", async (_m: string, url: string) =>
      url.startsWith("/savings")
        ? ({ data: { data: { goalId: null, title: null, template: null, delayDays: null, reason: "no_active_goal" } } } as never)
        : ({ data: { data: saved } } as never),
    );
    assert.deepEqual((await appHouseholdService.recordBatch("t", { expenses: [] })).goalClock, { state: "none", reason: "no_active_goal" });
  });

  it(`목표 시계가 ${GOAL_CLOCK_BUDGET_MS}ms 를 넘기거나 실패하면 pending — 저장 응답은 기다리지 않는다(수용 기준 2)`, async () => {
    mock.method(backendApi, "proxyAuthRequest", (_m: string, url: string) =>
      url.startsWith("/savings")
        ? new Promise((resolve) => setTimeout(() => resolve({ data: { data: {} } }), GOAL_CLOCK_BUDGET_MS + 300))
        : Promise.resolve({ data: { data: saved } }),
    );
    const started = Date.now();
    const vm = await appHouseholdService.record("t", {});
    assert.ok(Date.now() - started < GOAL_CLOCK_BUDGET_MS + 150);
    assert.deepEqual(vm.goalClock, { state: "pending" });
    assert.equal(vm.monthTotal, 30000);
  });

  it("파싱 — 본문을 그대로 서버로 · 서버가 거절해도 원문이 로그에 0(FR-2 · 수용 기준 1)", async () => {
    const marker = "ZQX-원문-9876";
    const lines: string[] = [];
    for (const level of ["info", "warn", "error", "debug"] as const) {
      mock.method(logger, level, (...args: unknown[]) => {
        lines.push(JSON.stringify(args));
        return logger;
      });
    }
    let sent: unknown;
    mock.method(backendApi, "proxyAuthRequest", async (_m: string, _u: string, _t: string, body: unknown) => {
      sent = body;
      throw Object.assign(new Error("Request failed with status code 400"), { response: { status: 400, data: { code: "PARSE_TEXT_TOO_LONG" } } });
    });
    await assert.rejects(appHouseholdService.parse("t", { mode: "messages", text: marker }));
    assert.deepEqual(sent, { mode: "messages", text: marker });
    assert.ok(!lines.some((l) => l.includes(marker)));
  });

  it("월 · 지우기 — 경로의 값은 인코딩", async () => {
    const seen: string[] = [];
    mock.method(backendApi, "proxyAuthRequest", async (m: string, url: string) => {
      seen.push(`${m} ${url}`);
      return { data: { data: {} } } as never;
    });
    await appHouseholdService.month("t", "2026-11");
    await appHouseholdService.deleteExpense("t", "a/b");
    assert.deepEqual(seen, ["GET /household/month/2026-11", "DELETE /household/expenses/a%2Fb"]);
  });
});

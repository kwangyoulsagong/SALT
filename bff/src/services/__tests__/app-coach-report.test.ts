import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { appCoachReportService } from "../app-coach-report.service";
import { backendApi } from "../backend-api.service";

/** 코치 리포트 · 생성 상태 호출 (`BFF-REQ-023` FR-10 · 12 · 13 · 61~63 · `BFF-REQ-025` 호출 맵). */

const ok = (data: unknown) => ({ data: { success: true, data } }) as never;
const httpError = (status: number) =>
  Object.assign(new Error(`status ${status}`), { response: { status, data: { message: "x" }, headers: {} } });

describe("AppCoachReportService", () => {
  afterEach(() => mock.restoreAll());

  it("서버 /coach/detail 을 800ms 로 1회 부른다", async () => {
    const calls: unknown[][] = [];
    mock.method(backendApi, "proxyAuthRequest", async (...args: unknown[]) => {
      calls.push(args);
      return ok({ disclaimer: "d", excluded: [], recommendation: null, risks: [], candidates: [], exitPlans: [], behaviorFacts: [] });
    });

    const view = await appCoachReportService.getReport("tok");

    assert.equal(calls.length, 1);
    assert.equal(calls[0][1], "/coach/detail");
    assert.equal((calls[0][4] as { timeout: number }).timeout, 800);
    assert.equal(view.status, "ok");
  });

  it("5xx 는 한 번 다시 부르고, 그래도 실패하면 200 unavailable — 캐시하지 않는다", async () => {
    let calls = 0;
    mock.method(backendApi, "proxyAuthRequest", async () => {
      calls += 1;
      throw httpError(503);
    });

    assert.deepEqual(await appCoachReportService.getReport("tok"), { status: "unavailable" });
    assert.equal(calls, 2);
  });

  it("4xx 는 그대로 올린다 — 401 이 unavailable 로 바뀌면 토큰 갱신이 안 된다", async () => {
    let calls = 0;
    mock.method(backendApi, "proxyAuthRequest", async () => {
      calls += 1;
      throw httpError(401);
    });

    await assert.rejects(appCoachReportService.getReport("tok"), /status 401/);
    assert.equal(calls, 1);
  });

  it("생성 상태는 서버 판정을 골라 옮긴다 — 300ms", async () => {
    const calls: unknown[][] = [];
    mock.method(backendApi, "proxyAuthRequest", async (...args: unknown[]) => {
      calls.push(args);
      return ok({
        lastGeneratedAt: null,
        lastRequest: null,
        inProgress: false,
        cooldownSeconds: 300,
        retryAfterSeconds: 120,
        extra: "dropped",
      });
    });

    const view = await appCoachReportService.getGenerationStatus("tok");

    assert.equal(calls[0][1], "/coach/generation-status");
    assert.equal((calls[0][4] as { timeout: number }).timeout, 300);
    assert.equal(view.retryAfterSeconds, 120);
    assert.equal("extra" in view, false);
  });
});

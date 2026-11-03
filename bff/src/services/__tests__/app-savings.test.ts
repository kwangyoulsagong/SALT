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
});

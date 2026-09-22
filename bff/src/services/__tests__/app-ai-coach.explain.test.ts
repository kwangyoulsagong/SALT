import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { AppError } from "../../utils/error.util";
import { appAICoachService } from "../app-ai-coach.service";
import { backendApi } from "../backend-api.service";

const ok = (data: unknown) => ({ data: { success: true, data } }) as never;

describe("AppAICoachService.explain", () => {
  afterEach(() => mock.restoreAll());

  it("토큰을 전달하고 20s 타임아웃으로 부른다 — 본문은 그대로", async () => {
    const calls: unknown[][] = [];
    mock.method(backendApi, "proxyAuthRequest", async (...args: unknown[]) => {
      calls.push(args);
      return ok({ renderable: false, blockedReason: "insufficient_sample" });
    });
    const body = { symbol: "BTC", mode: "scalp" };

    const data = await appAICoachService.explain("tok", body);

    assert.equal(calls.length, 1);
    const [method, url, token, sent, options] = calls[0] as [string, string, string, unknown, { timeout: number }];
    assert.equal(method, "POST");
    assert.equal(url, "/ai-coach/explain");
    assert.equal(token, "tok");
    assert.equal(sent, body);
    assert.equal(options.timeout, 20_000);
    // renderable: false 도 에러가 아니다 (FR-44)
    assert.deepEqual(data, { renderable: false, blockedReason: "insufficient_sample" });
  });

  it("실패해도 재시도하지 않는다", async () => {
    let calls = 0;
    mock.method(backendApi, "proxyAuthRequest", async () => {
      calls += 1;
      throw Object.assign(new Error("timeout"), { code: "ECONNABORTED" });
    });

    await assert.rejects(appAICoachService.explain("tok", {}));
    assert.equal(calls, 1);
  });

  it("동시 2개를 넘으면 서버에 보내지 않고 429 explain_busy", async () => {
    let calls = 0;
    const pending: Array<() => void> = [];
    mock.method(backendApi, "proxyAuthRequest", () => {
      calls += 1;
      return new Promise((resolve) => pending.push(() => resolve(ok({}))));
    });

    const first = appAICoachService.explain("tok", {});
    const second = appAICoachService.explain("tok", {});

    await assert.rejects(appAICoachService.explain("tok", {}), (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 429);
      assert.equal(error.message, "explain_busy");
      return true;
    });
    assert.equal(calls, 2);

    pending.forEach((resolve) => resolve());
    await Promise.all([first, second]);

    // 끝나면 자리가 돌아온다 — 실패로 끝나도 마찬가지(finally)
    const third = appAICoachService.explain("tok", {});
    pending[2]?.();
    await third;
    assert.equal(calls, 3);
  });
});

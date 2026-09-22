import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { retryOnceOnGet } from "../retry.util";

const upstream = (status: number) =>
  Object.assign(new Error(String(status)), { response: { status } });
const timeout = () => Object.assign(new Error("timeout"), { code: "ECONNABORTED" });
const canceled = () => Object.assign(new Error("canceled"), { code: "ERR_CANCELED" });

const failingThen = (first: Error) => {
  let calls = 0;
  return {
    call: async () => {
      calls += 1;
      if (calls === 1) throw first;
      return "ok";
    },
    get calls() {
      return calls;
    },
  };
};

describe("retryOnceOnGet", () => {
  it("timeout 이면 한 번 더 부른다", async () => {
    const f = failingThen(timeout());
    assert.equal(await retryOnceOnGet(() => f.call()), "ok");
    assert.equal(f.calls, 2);
  });

  it("5xx 면 한 번 더 부른다", async () => {
    const f = failingThen(upstream(503));
    assert.equal(await retryOnceOnGet(() => f.call()), "ok");
    assert.equal(f.calls, 2);
  });

  for (const status of [401, 404, 422, 429]) {
    it(`${status} 는 다시 부르지 않는다`, async () => {
      const f = failingThen(upstream(status));
      await assert.rejects(retryOnceOnGet(() => f.call()));
      assert.equal(f.calls, 1);
    });
  }

  it("최대 1회 — 두 번째도 실패하면 그 에러를 던진다", async () => {
    let calls = 0;
    await assert.rejects(
      retryOnceOnGet(async () => {
        calls += 1;
        throw upstream(500);
      }),
    );
    assert.equal(calls, 2);
  });

  it("클라이언트가 끊었으면 다시 부르지 않는다", async () => {
    const aborter = new AbortController();
    aborter.abort();
    const f = failingThen(timeout());
    await assert.rejects(retryOnceOnGet(() => f.call(), aborter.signal));
    assert.equal(f.calls, 1);
  });

  it("취소 에러는 다시 부르지 않는다", async () => {
    const f = failingThen(canceled());
    await assert.rejects(retryOnceOnGet(() => f.call()));
    assert.equal(f.calls, 1);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createRatePacer } from "../pacer";

/**
 * 출발 간격 제한 테스트.
 *
 * **시계를 주입한다** — 진짜로 1초씩 기다리면 아무도 안 돌린다. `sleep` 은 시계를
 * 그만큼 앞으로 민다.
 */
const fakeClock = () => {
  let t = 0;
  return {
    now: () => t,
    sleep: async (ms: number) => {
      t += ms;
    },
    get t() {
      return t;
    },
  };
};

describe("createRatePacer", () => {
  it("첫 호출은 기다리지 않는다", async () => {
    const clock = fakeClock();
    const pacer = createRatePacer({ perSecond: 4, now: clock.now, sleep: clock.sleep });

    const startedAt = await pacer.run(async () => clock.t);

    assert.equal(startedAt, 0);
  });

  it("동시에 던져도 1000 / perSecond 간격으로 출발한다", async () => {
    const clock = fakeClock();
    const pacer = createRatePacer({ perSecond: 4, now: clock.now, sleep: clock.sleep });

    const startedAt: number[] = [];
    await Promise.all(
      [1, 2, 3, 4, 5].map(() => pacer.run(async () => startedAt.push(clock.t)))
    );

    // 한꺼번에 내보내지 않는다 — 몰려서 출발하면 도착도 몰린다
    assert.deepEqual(startedAt, [0, 250, 500, 750, 1000]);
  });

  it("간격보다 늦게 온 호출은 기다리지 않는다", async () => {
    const clock = fakeClock();
    const pacer = createRatePacer({ perSecond: 4, now: clock.now, sleep: clock.sleep });

    await pacer.run(async () => undefined);
    await clock.sleep(1_000);
    const startedAt = await pacer.run(async () => clock.t);

    assert.equal(startedAt, 1_000);
  });

  it("요청 순서대로 출발한다", async () => {
    const clock = fakeClock();
    const pacer = createRatePacer({ perSecond: 1, now: clock.now, sleep: clock.sleep });

    const order: string[] = [];
    await Promise.all(
      ["a", "b", "c"].map((id) => pacer.run(async () => order.push(id)))
    );

    assert.deepEqual(order, ["a", "b", "c"]);
  });

  it("앞 호출이 실패해도 뒤 호출은 출발한다", async () => {
    const clock = fakeClock();
    const pacer = createRatePacer({ perSecond: 1, now: clock.now, sleep: clock.sleep });

    const failed = pacer.run(async () => {
      throw new Error("거래소 오류");
    });
    const next = pacer.run(async () => "ok");

    await assert.rejects(failed, /거래소 오류/);
    assert.equal(await next, "ok");
  });
});

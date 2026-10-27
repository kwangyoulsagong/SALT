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

describe("createRatePacer — 우선순위(F011 FR-91)", () => {
  it("자리가 날 때 기다리는 것 중 작은 우선순위가 먼저 나간다 · 같은 우선순위는 요청 순서", async () => {
    const clock = fakeClock();
    const pacer = createRatePacer({ perSecond: 1, now: clock.now, sleep: clock.sleep });

    const order: string[] = [];
    await Promise.all([
      pacer.run(async () => order.push("candle-1"), 2),
      pacer.run(async () => order.push("candle-2"), 2),
      pacer.run(async () => order.push("extra"), 3),
      pacer.run(async () => order.push("poll-1"), 1),
      pacer.run(async () => order.push("poll-2"), 1),
    ]);

    // 첫 호출은 줄이 비어 바로 나간다 — 그 뒤부터 우선순위
    assert.deepEqual(order, ["candle-1", "poll-1", "poll-2", "candle-2", "extra"]);
  });

  it("간격을 기다리는 동안 들어온 급한 호출이 앞선다", async () => {
    let t = 0;
    let onSleep: (() => void) | null = null;
    const pacer = createRatePacer({
      perSecond: 1,
      now: () => t,
      sleep: async (ms: number) => {
        onSleep?.();
        onSleep = null;
        t += ms;
      },
    });

    const order: string[] = [];
    const first = pacer.run(async () => order.push("a"), 2);
    // 두 번째 출발을 기다리는 사이 보유 종목 시세가 들어온다
    onSleep = () => void pacer.run(async () => order.push("urgent"), 0);
    const second = pacer.run(async () => order.push("b"), 2);
    await Promise.all([first, second]);
    await new Promise((resolve) => setImmediate(resolve));

    assert.deepEqual(order, ["a", "urgent", "b"]);
  });
});

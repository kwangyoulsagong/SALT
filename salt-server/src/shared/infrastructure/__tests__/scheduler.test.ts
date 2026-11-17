import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { attachCatchUp, runAtBootInOrder, runGuarded } from "../scheduler";
import type { WakeEvent } from "../wake";

/**
 * 놓친 회차 따라 돌기(F011 슬라이스 6b). node-cron 의 `execution:missed` 를 손으로 쏜다 —
 * 진짜로 수면을 재현할 수는 없다
 */
const fakeTask = (next: () => Date | null = () => null) => {
  const handlers: Record<string, Array<() => void>> = {};
  return {
    on: (event: string, fn: () => void) => void (handlers[event] ??= []).push(fn),
    miss: () => (handlers["execution:missed"] ?? []).forEach((fn) => fn()),
    start: () => (handlers["execution:started"] ?? []).forEach((fn) => fn()),
    getNextRun: next,
  };
};
const noWake = () => {};
/** 깸 구독을 손에 쥔다 — 진짜 수면 대신 깸 사건을 쏜다 */
const wakeHub = () => {
  const subs: Array<(e: WakeEvent) => unknown> = [];
  return {
    subscribe: (_n: string, fn: (e: WakeEvent) => unknown) => void subs.push(fn),
    wake: (from: string, to: string) =>
      subs.forEach((fn) => fn({ from: new Date(from), to: new Date(to), sleptMs: Date.parse(to) - Date.parse(from) })),
  };
};

describe("attachCatchUp", () => {
  it("놓친 회차 이벤트가 오면 한 번 돈다", () => {
    const task = fakeTask();
    let runs = 0;
    attachCatchUp(task as never, "t-once", async () => void runs++, () => 0, noWake);

    task.miss();

    assert.equal(runs, 1);
  });

  it("같은 깨어남에 이벤트가 여러 개(회차 여러 개를 놓침) 와도 한 번이다", () => {
    const task = fakeTask();
    let runs = 0;
    let t = 0;
    attachCatchUp(task as never, "t-burst", async () => void runs++, () => t, noWake);

    task.miss();
    t += 5;
    task.miss();
    task.miss();

    assert.equal(runs, 1);
  });

  it("다음 깨어남(1분 뒤)은 다시 돈다", () => {
    const task = fakeTask();
    let runs = 0;
    let t = 0;
    attachCatchUp(task as never, "t-later", async () => void runs++, () => t, noWake);

    task.miss();
    t += 60_000;
    task.miss();

    assert.equal(runs, 2);
  });
});

describe("attachCatchUp — 깸 길(프로세스가 뜬 뒤 첫 회차)", () => {
  // node-cron 은 첫 박동 전엔 '지난 예정 시각'을 몰라 첫 회차를 자며 지나치면 missed 이벤트를 안 쏜다(2026-11-17 08:40 실측 · 재현)
  it("잠든 사이 다음 회차가 지났으면 missed 이벤트 없이도 한 번 돈다", () => {
    const hub = wakeHub();
    let next = new Date("2026-11-16T23:40:00Z"); // 08:40 KST
    const task = fakeTask(() => next);
    let runs = 0;
    let t = 0;
    attachCatchUp(task as never, "t-first-slot", async () => void runs++, () => t, hub.subscribe);
    next = new Date("2026-11-17T07:40:00Z"); // 깬 뒤 node-cron 이 다음 회차(16:40)로 넘김
    t = 1;
    hub.wake("2026-11-16T23:35:00Z", "2026-11-16T23:45:00Z");
    assert.equal(runs, 1);
  });

  it("잠든 사이 회차가 없었으면 돌지 않는다", () => {
    const hub = wakeHub();
    const task = fakeTask(() => new Date("2026-11-16T23:40:00Z"));
    let runs = 0;
    attachCatchUp(task as never, "t-no-slot", async () => void runs++, () => 0, hub.subscribe);
    hub.wake("2026-11-16T23:00:00Z", "2026-11-16T23:30:00Z");
    assert.equal(runs, 0);
  });

  it("missed 와 깸이 같은 깨어남에 같이 오면 한 번", () => {
    const hub = wakeHub();
    const task = fakeTask(() => new Date("2026-11-16T23:40:00Z"));
    let runs = 0;
    let t = 0;
    attachCatchUp(task as never, "t-both", async () => void runs++, () => t, hub.subscribe);
    task.miss();
    t = 2_000;
    hub.wake("2026-11-16T23:35:00Z", "2026-11-16T23:45:00Z");
    assert.equal(runs, 1);
  });

  it("제때 돈 회차는 깸에 다시 돌지 않는다 — 시작할 때 다음 회차로 옮긴다", () => {
    const hub = wakeHub();
    let next = new Date("2026-11-16T23:40:00Z");
    const task = fakeTask(() => next);
    let runs = 0;
    attachCatchUp(task as never, "t-ran", async () => void runs++, () => 0, hub.subscribe);
    next = new Date("2026-11-17T07:40:00Z");
    task.start(); // 08:40 에 제때 돌았다
    hub.wake("2026-11-17T00:00:00Z", "2026-11-17T01:00:00Z");
    assert.equal(runs, 0);
  });
});

describe("runAtBootInOrder — 부팅 실행은 cron 과 같은 락 · 하나씩(2026-11-17 재기동 뒤 504)", () => {
  it("차례로 돈다 — 둘이 겹치지 않는다 · 실패해도 다음을 돈다", async () => {
    const log: string[] = [];
    let inFlight = 0;
    let maxInFlight = 0;
    const job = (name: string, fail = false) => ({
      name: `boot-test-${name}`,
      run: async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        log.push(`start ${name}`);
        await new Promise((r) => setTimeout(r, 5));
        log.push(`end ${name}`);
        inFlight -= 1;
        if (fail) throw new Error("boom");
      },
    });
    await runAtBootInOrder([job("a"), job("b", true), job("c")]);
    assert.deepEqual(log, ["start a", "end a", "start b", "end b", "start c", "end c"]);
    assert.equal(maxInFlight, 1);
  });

  it("부팅 실행이 도는 동안 같은 이름의 회차(cron · 깸)는 건너뛴다 — 겹쳐 돌지 않는다", async () => {
    let runs = 0;
    let release!: () => void;
    const slow = { name: "boot-test-lock", run: () => new Promise<void>((r) => { runs += 1; release = r; }) };
    const boot = runAtBootInOrder([slow]);
    await runGuarded("boot-test-lock", async () => { runs += 1; });
    assert.equal(runs, 1);
    release();
    await boot;
    await runGuarded("boot-test-lock", async () => { runs += 1; });
    assert.equal(runs, 2);
  });
});

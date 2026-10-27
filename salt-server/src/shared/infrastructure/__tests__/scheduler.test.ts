import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { attachCatchUp } from "../scheduler";

/**
 * 놓친 회차 따라 돌기(F011 슬라이스 6b). node-cron 의 `execution:missed` 를 손으로 쏜다 —
 * 진짜로 수면을 재현할 수는 없다
 */
const fakeTask = () => {
  const handlers: Array<() => void> = [];
  return {
    on: (_event: string, fn: () => void) => void handlers.push(fn),
    miss: () => handlers.forEach((fn) => fn()),
  };
};

describe("attachCatchUp", () => {
  it("놓친 회차 이벤트가 오면 한 번 돈다", () => {
    const task = fakeTask();
    let runs = 0;
    attachCatchUp(task as never, "t-once", async () => void runs++, () => 0);

    task.miss();

    assert.equal(runs, 1);
  });

  it("같은 깨어남에 이벤트가 여러 개(회차 여러 개를 놓침) 와도 한 번이다", () => {
    const task = fakeTask();
    let runs = 0;
    let t = 0;
    attachCatchUp(task as never, "t-burst", async () => void runs++, () => t);

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
    attachCatchUp(task as never, "t-later", async () => void runs++, () => t);

    task.miss();
    t += 60_000;
    task.miss();

    assert.equal(runs, 2);
  });
});

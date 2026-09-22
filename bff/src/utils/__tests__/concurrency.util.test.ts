import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createConcurrencyGate } from "../concurrency.util";

describe("createConcurrencyGate", () => {
  it("상한까지 주고 그다음은 null — 줄을 세우지 않는다", () => {
    const gate = createConcurrencyGate(2);
    const a = gate.tryAcquire();
    const b = gate.tryAcquire();
    assert.ok(a && b);
    assert.equal(gate.tryAcquire(), null);

    a();
    assert.ok(gate.tryAcquire());
  });

  it("release 를 두 번 불러도 한 번만 센다", () => {
    const gate = createConcurrencyGate(1);
    const a = gate.tryAcquire()!;
    a();
    a();
    assert.equal(gate.active, 0);
    assert.ok(gate.tryAcquire());
    assert.equal(gate.tryAcquire(), null);
  });
});

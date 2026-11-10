import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createWakeDetector, describeSleep, dispatchWake, onWake } from "../wake";

/** 잠 감지(`SRV-REQ-057` FR-6) — 벽시계 점프 > 90초 = 깸. 구독은 등록 순서 · 하나의 실패가 다음을 막지 않는다 */
describe("잠 감지", () => {
  it("박동 사이 90초 넘게 뛰면 깸, 아니면 null — 경계 90초는 깸 아님", () => {
    let t = 0;
    const d = createWakeDetector(() => t);
    t = 30_000;
    assert.equal(d.tick(), null);
    t += 90_000;
    assert.equal(d.tick(), null);
    t += 90_001;
    const event = d.tick();
    assert.ok(event);
    assert.equal(event.sleptMs, 90_001);
    assert.equal(d.tick(), null, "한 번만");
  });

  it("로그 한 줄 — KST 시각 · 시간", () => {
    const line = describeSleep({
      from: new Date("2026-11-10T19:27:00Z"),
      to: new Date("2026-11-10T23:27:00Z"),
      sleptMs: 4 * 3600_000,
    });
    assert.equal(line, "💤→☀️ 수면 04:27~08:27(4.0시간) — 따라잡기 시작");
  });

  it("구독 넷이 등록 순서로 한 번씩 — 실패해도 다음이 돈다", async () => {
    const ran: string[] = [];
    onWake("a", () => void ran.push("a"));
    onWake("b", () => {
      ran.push("b");
      throw new Error("boom");
    });
    onWake("c", async () => void ran.push("c"));
    onWake("d", () => void ran.push("d"));
    await dispatchWake({ from: new Date(0), to: new Date(200_000), sleptMs: 200_000 });
    assert.deepEqual(ran, ["a", "b", "c", "d"]);
  });
});

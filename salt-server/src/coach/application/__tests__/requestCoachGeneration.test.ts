import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  CoachGenerationLogStore,
  CoachGenerationSource,
} from "../../domain";
import type { GenerateCoachRecommendation } from "../GenerateCoachRecommendation";
import { RequestCoachGeneration } from "../RequestCoachGeneration";

/**
 * 수동 재생성 요청 (`SRV-REQ-025` FR-10 · `SRV-REQ-024` FR-80~84).
 *
 * 기록 저장소는 메모리다. 확인하는 것: 쿨다운이 무엇에 걸리는가, 받은 요청이 기다리지 않는가,
 * 거부 · 실패가 기록되는가.
 */

const T0 = new Date("2026-09-23T00:00:00Z");

type Row = { id: string; source: CoachGenerationSource; status: string; requestedAt: Date };

class MemoryLogs implements Partial<CoachGenerationLogStore> {
  rows: Row[] = [];

  async start(_userId: string, source: CoachGenerationSource, requestedAt: Date) {
    const id = `log-${this.rows.length}`;
    this.rows.push({ id, source, status: "running", requestedAt });
    return id;
  }

  async recordRejected(_userId: string, requestedAt: Date) {
    this.rows.push({ id: "r", source: "manual", status: "cooldown_rejected", requestedAt });
  }

  async lastAcceptedManualAt() {
    const hits = this.rows
      .filter((row) => row.source === "manual" && row.status !== "cooldown_rejected")
      .map((row) => row.requestedAt.getTime());
    return hits.length ? new Date(Math.max(...hits)) : null;
  }
}

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<null>((r) => (resolve = () => r(null)));
  return { promise, resolve };
};

describe("RequestCoachGeneration", () => {
  it("받으면 기록을 먼저 만들고 생성을 기다리지 않는다", async () => {
    const logs = new MemoryLogs();
    const pending = deferred();
    const calls: unknown[] = [];
    const generate = {
      execute: (...args: unknown[]) => {
        calls.push(args);
        return pending.promise;
      },
    } as unknown as GenerateCoachRecommendation;

    const result = await new RequestCoachGeneration(
      logs as unknown as CoachGenerationLogStore, generate, 300, () => T0
    ).execute("u1", { symbol: "BTC" });

    assert.deepEqual(result, { accepted: true, requestId: "log-0", requestedAt: T0.toISOString() });
    assert.equal(logs.rows[0].status, "running", "생성이 끝나기 전에 돌아왔다");
    assert.deepEqual(calls[0], ["u1", { symbol: "BTC" }, { source: "manual", logId: "log-0" }]);
    pending.resolve();
  });

  it("쿨다운 중이면 거부를 기록하고 남은 초를 준다 — 생성하지 않는다", async () => {
    const logs = new MemoryLogs();
    logs.rows.push({ id: "a", source: "manual", status: "succeeded", requestedAt: T0 });
    let called = 0;
    const generate = { execute: async () => (called++, null) } as unknown as GenerateCoachRecommendation;

    const result = await new RequestCoachGeneration(
      logs as unknown as CoachGenerationLogStore, generate, 300,
      () => new Date(T0.getTime() + 60_000)
    ).execute("u1");

    assert.deepEqual(result, { accepted: false, retryAfterSeconds: 240 });
    assert.equal(called, 0);
    assert.equal(logs.rows.at(-1)?.status, "cooldown_rejected");
  });

  it("거부와 워커 생성은 쿨다운을 늘리지 않는다", async () => {
    const logs = new MemoryLogs();
    logs.rows.push({ id: "a", source: "manual", status: "succeeded", requestedAt: T0 });
    logs.rows.push({ id: "b", source: "manual", status: "cooldown_rejected", requestedAt: new Date(T0.getTime() + 200_000) });
    logs.rows.push({ id: "c", source: "worker", status: "succeeded", requestedAt: new Date(T0.getTime() + 290_000) });
    const generate = { execute: async () => null } as unknown as GenerateCoachRecommendation;

    const result = await new RequestCoachGeneration(
      logs as unknown as CoachGenerationLogStore, generate, 300,
      () => new Date(T0.getTime() + 300_000)
    ).execute("u1");

    assert.equal(result.accepted, true);
  });

  it("뒤에서 생성이 실패해도 요청은 받았고 프로세스를 죽이지 않는다", async () => {
    const logs = new MemoryLogs();
    const generate = {
      execute: async () => {
        throw new Error("boom");
      },
    } as unknown as GenerateCoachRecommendation;

    const result = await new RequestCoachGeneration(
      logs as unknown as CoachGenerationLogStore, generate, 300, () => T0
    ).execute("u1");
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(result.accepted, true);
  });
});

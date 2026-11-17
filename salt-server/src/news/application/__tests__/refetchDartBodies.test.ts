import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AiBodyStore, DartPort } from "../../domain";
import { RefetchDartBodies } from "../RefetchDartBodies";

/** 깨진 DART 본문 다시 받기(2026-11-17) — 고친 디코더로 안 읽은 행만 · 실패는 그 행만 · 다 끝나면 호출 0 · 키 없으면 꺼짐 */
const harness = (todo: Array<{ key: string; rceptNo: string }>, fail: string[] = [], awaiting = 0) => {
  const limits: number[] = [];
  const docs: string[] = [];
  const replaced: Array<{ key: string; paragraphs: string[]; chars: number }> = [];
  const dart = {
    document: async (no: string) => (docs.push(no), fail.includes(no) ? Promise.reject(new Error("down")) : ["가. 결정", "1 | 120억원"]),
  } as unknown as DartPort;
  const bodies = {
    dartRefetchedAwaitingExtraction: async () => awaiting,
    dartBodiesToRefetch: async (limit: number) => (limits.push(limit), todo.slice(0, limit)),
    replaceDisclosureBody: async (row: { key: string; paragraphs: string[]; chars: number }) => void replaced.push(row),
  } as unknown as AiBodyStore;
  return { docs, replaced, limits, uc: (on = true) => new RefetchDartBodies({ dart: on ? dart : null, bodies }, () => new Date("2026-11-17T06:00:00Z"), async () => {}) };
};

describe("RefetchDartBodies", () => {
  it("대상 본문을 다시 받아 바꾼다 — 실패는 그 행만(다음 회차에 다시)", async () => {
    const h = harness([{ key: "dart:1", rceptNo: "1" }, { key: "dart:2", rceptNo: "2" }, { key: "dart:3", rceptNo: "3" }], ["2"]);
    const r = await h.uc().execute();
    assert.deepEqual(h.docs, ["1", "2", "3"]);
    assert.deepEqual(h.replaced.map((x) => x.key), ["dart:1", "dart:3"]);
    assert.equal(h.replaced[0]?.chars, "가. 결정\n1 | 120억원".length);
    assert.deepEqual([r.refetched, r.failed], [2, 1]);
  });
  it("남은 것이 없으면 호출 0 · 키 없으면 꺼짐", async () => {
    const empty = harness([]);
    await empty.uc().execute();
    assert.deepEqual(empty.docs, []);
    const off = harness([{ key: "dart:1", rceptNo: "1" }]);
    assert.equal((await off.uc(false).execute()).enabled, false);
    assert.deepEqual(off.docs, []);
  });

  it("추출을 기다리는 다시 받은 본문만큼 덜 받는다 — 상한(20)이면 0(받으면 추출 전에 7일이 지나 지워진다)", async () => {
    const todo = Array.from({ length: 30 }, (_, i) => ({ key: `dart:${i}`, rceptNo: String(i) }));
    const some = harness(todo, [], 15);
    const r = await some.uc().execute();
    assert.deepEqual([some.limits, r.refetched, r.awaiting], [[5], 5, 15]);
    const full = harness(todo, [], 20);
    assert.equal((await full.uc().execute()).refetched, 0);
    assert.deepEqual([full.limits, full.docs], [[], []]);
    const none = harness(todo, [], 0);
    await none.uc().execute();
    assert.deepEqual(none.limits, [20]);
  });
});

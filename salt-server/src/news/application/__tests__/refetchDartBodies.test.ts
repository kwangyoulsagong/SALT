import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AiBodyStore, DartPort } from "../../domain";
import { RefetchDartBodies } from "../RefetchDartBodies";

/** 깨진 DART 본문 다시 받기(2026-11-17) — 고친 디코더로 안 읽은 행만 · 실패는 그 행만 · 다 끝나면 호출 0 · 키 없으면 꺼짐 */
const harness = (todo: Array<{ key: string; rceptNo: string }>, fail: string[] = []) => {
  const docs: string[] = [];
  const replaced: Array<{ key: string; paragraphs: string[]; chars: number }> = [];
  const dart = {
    document: async (no: string) => (docs.push(no), fail.includes(no) ? Promise.reject(new Error("down")) : ["가. 결정", "1 | 120억원"]),
  } as unknown as DartPort;
  const bodies = {
    dartBodiesToRefetch: async () => todo,
    replaceDisclosureBody: async (row: { key: string; paragraphs: string[]; chars: number }) => void replaced.push(row),
  } as unknown as AiBodyStore;
  return { docs, replaced, uc: (on = true) => new RefetchDartBodies({ dart: on ? dart : null, bodies }, () => new Date("2026-11-17T06:00:00Z"), async () => {}) };
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
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AiBodyStore, AiBodyStatus, DartFiling, DartPort } from "../../domain";
import { CollectDartDisclosures } from "../CollectDartDisclosures";

/** F017 v4 2b — 공시 한 회차: 유니버스만 · 처음 본 것만 · 원문 실패는 그 공시만 · 키 없으면 꺼짐 */

const NOW = new Date("2026-11-14T03:00:00Z");
const filing = (rceptNo: string, stockCode: string, over: Partial<DartFiling> = {}): DartFiling => ({
  rceptNo, stockCode, corpName: `회사${stockCode}`, reportName: "단일판매ㆍ공급계약체결", rceptDate: "20261114", filer: "x", ...over,
});

const harness = (opts: { b?: DartFiling[]; i?: DartFiling[]; known?: string[]; fail?: string[]; pages?: number }) => {
  const saved: Array<{ key: string; symbols: string[]; url: string; publishedAt: Date }> = [];
  const docs: string[] = [];
  const listed: string[] = [];
  const dart: DartPort = {
    list: async (type, bgn, end, page) => {
      listed.push(`${type}:${bgn}-${end}:${page}`);
      const all = (type === "B" ? opts.b : opts.i) ?? [];
      const pages = opts.pages ?? 1;
      return { items: all.filter((_, k) => k % pages === page - 1), totalPage: pages };
    },
    document: async (no) => {
      docs.push(no);
      if (opts.fail?.includes(no)) throw new Error("down");
      return ["1. 계약금액 | 120억원"];
    },
  };
  const bodies = {
    statuses: async (keys: string[]) => new Map(keys.filter((k) => opts.known?.includes(k)).map((k) => [k, "ok" as AiBodyStatus])),
    saveDisclosures: async (rows: typeof saved) => (saved.push(...rows), rows.length),
  } as unknown as AiBodyStore;
  const uc = (withDart = true) =>
    new CollectDartDisclosures({ dart: withDart ? dart : null, universe: { codes: async () => ["005930", "000660"] }, bodies }, () => NOW, async () => {});
  return { uc, saved, docs, listed };
};

describe("CollectDartDisclosures", () => {
  it("어제 · 오늘 · 주요사항(B) · 거래소(I) 목록 — 유니버스 종목 · 처음 본 것만 원문", async () => {
    const h = harness({ b: [filing("1", "005930")], i: [filing("2", "000660"), filing("3", "999999"), filing("4", "005930")], known: ["dart:4"] });
    const r = await h.uc().execute();
    assert.deepEqual(h.listed, ["B:20261113-20261114:1", "I:20261113-20261114:1"]);
    assert.deepEqual(h.docs, ["1", "2"]);
    assert.deepEqual([r.listed, r.universe, r.fresh, r.saved], [4, 3, 2, 2]);
    assert.deepEqual(h.saved[0]?.symbols, ["005930"]);
    assert.equal(h.saved[0]?.url, "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=1");
    assert.equal(h.saved[0]?.publishedAt.toISOString(), "2026-11-13T15:00:00.000Z");
  });
  it("쪽을 끝까지 넘긴다", async () => {
    const h = harness({ i: [filing("1", "005930"), filing("2", "005930"), filing("3", "005930")], pages: 3 });
    assert.equal((await h.uc().execute()).listed, 3);
    assert.deepEqual(h.listed.filter((l) => l.startsWith("I")).length, 3);
  });
  it("원문 실패는 그 공시만 · 세 번 실패면 그 프로세스에선 그만", async () => {
    const h = harness({ i: [filing("1", "005930"), filing("2", "000660")], fail: ["1"] });
    const uc = h.uc();
    const r = await uc.execute();
    assert.deepEqual([r.saved, r.failed], [1, 1]);
    await uc.execute();
    await uc.execute();
    const last = await uc.execute();
    assert.equal(h.docs.filter((d) => d === "1").length, 3);
    assert.equal(last.fresh, 1); // "2" 는 저장 대신 알려진 키가 아니라(가짜 저장소) 다시 후보 — "1" 만 빠졌다
  });
  it("회차 상한을 넘으면 다음 회차", async () => {
    const many = Array.from({ length: 25 }, (_, k) => filing(String(k), "005930"));
    const r = await harness({ i: many }).uc().execute();
    assert.deepEqual([r.saved, r.deferred], [20, 5]);
  });
  it("키가 없으면 목록도 부르지 않는다", async () => {
    const h = harness({ i: [filing("1", "005930")] });
    const r = await h.uc(false).execute();
    assert.deepEqual([r.enabled, h.listed.length], [false, 0]);
  });
});

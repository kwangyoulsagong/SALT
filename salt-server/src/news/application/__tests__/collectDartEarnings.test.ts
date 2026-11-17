import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DartEarningsFilingRow, DartEarningsStore, DartFiling, DartPort, EarningsSchedule } from "../../domain";
import { CollectDartDisclosures } from "../CollectDartDisclosures";
import { CollectDartEarnings } from "../CollectDartEarnings";

/** F008 슬라이스 24 2단계 — 실적 이력 맞춤(처음 2016 ~ · 그 뒤 14일) · IR · 예고 본문 일정 · 공시 회차가 실적 행도 넣음 */

const NOW = new Date("2026-11-17T03:00:00Z");
const filing = (rceptNo: string, stockCode: string, reportName: string, rceptDate = "20261113"): DartFiling => ({
  rceptNo, stockCode, corpName: `회사${stockCode}`, reportName, rceptDate, filer: "x",
});

const IR_DOC = ["1. 일시 및 장소", "일시", "2026-11-20", "16:00", "장소", "-", "3. 개최목적", "2026년 3분기 경영실적 발표", "4. 개최방법"];

const harness = (opts: { synced?: Record<string, Date>; lists?: Record<string, DartFiling[]>; pending?: Array<{ rceptNo: string; kind: "ir" | "preview"; attempts: number }>; fail?: string[]; docs?: Record<string, string[]> }) => {
  const calls: string[] = [];
  const dart: DartPort = {
    list: async () => ({ items: [], totalPage: 0 }),
    corpCodes: async () => new Map([["005930", "00126380"], ["000660", "00164779"]]),
    listByCorp: async (corp, type, bgn, end, page) => {
      calls.push(`${corp}:${type}:${bgn}-${end}:${page}`);
      return { items: opts.lists?.[`${corp}:${type}`] ?? [], totalPage: 1 };
    },
    document: async (no) => {
      calls.push(`doc:${no}`);
      if (opts.fail?.includes(no)) throw new Error("down");
      if (no.startsWith("gone")) throw Object.assign(new Error("DART document 014"), { code: "DART_014" });
      return opts.docs?.[no] ?? IR_DOC;
    },
  };
  const saved: Array<DartEarningsFilingRow & { type: string }> = [];
  const marks: string[] = [];
  const sinceSeen: Date[] = [];
  const docResults: Array<{ rceptNo: string; status: string | null; schedule: EarningsSchedule | null }> = [];
  const store: DartEarningsStore = {
    save: async (rows) => (saved.push(...rows), rows.length),
    synced: async () => new Map(Object.entries(opts.synced ?? {})),
    markSynced: async (code) => void marks.push(code),
    pendingDocs: async (_limit, since) => (sinceSeen.push(since), opts.pending ?? []),
    saveDocs: async (rs) => void docResults.push(...rs),
  };
  const universe = { codes: async () => ["005930", "000660", "069500"] };
  const uc = (withDart = true) => new CollectDartEarnings({ dart: withDart ? dart : null, universe, earnings: store }, () => NOW, async () => {});
  return { uc, dart, store, universe, calls, saved, marks, docResults, sinceSeen };
};

describe("CollectDartEarnings", () => {
  it("키가 없으면 꺼짐 — 호출 0", async () => {
    const h = harness({});
    const r = await h.uc(false).execute();
    assert.equal(r.enabled, false);
    assert.deepEqual(h.calls, []);
  });

  it("처음 맞추는 종목은 2016-01-01 부터 정기(A) · 거래소(I) — 실적 · IR · 예고만 남긴다 · 고유번호 없는 종목(ETF)도 표시", async () => {
    const h = harness({
      lists: {
        "00126380:A": [filing("a1", "005930", "분기보고서 (2026.09)", "20261114"), filing("a2", "005930", "[기재정정]분기보고서 (2026.06)")],
        "00126380:I": [filing("i1", "005930", "연결재무제표기준영업(잠정)실적(공정공시)"), filing("i2", "005930", "기업설명회(IR)개최(안내공시)"), filing("i3", "005930", "현금ㆍ현물배당결정")],
      },
    });
    const r = await h.uc().execute();
    assert.ok(h.calls.includes("00126380:A:20160101-20261117:1"));
    assert.ok(h.calls.includes("00126380:I:20160101-20261117:1"));
    assert.deepEqual(h.saved.filter((s) => s.stockCode === "005930").map((s) => [s.rceptNo, s.kind, s.periodEnd, s.type]), [
      ["a1", "earnings", "2026-09-30", "A"],
      ["i1", "earnings", null, "I"],
      ["i2", "ir", null, "I"],
    ]);
    assert.deepEqual(h.marks, ["005930", "000660", "069500"]);
    assert.equal(r.fullStocks, 3);
  });

  it("이미 맞춘 종목 — 20시간 지나면 최근 14일만, 안 지났으면 건너뜀", async () => {
    const h = harness({ synced: { "005930": new Date("2026-11-16T06:00:00Z"), "000660": new Date("2026-11-17T01:00:00Z"), "069500": new Date("2026-11-16T07:00:00Z") } });
    const r = await h.uc().execute();
    assert.deepEqual(h.calls, ["00126380:A:20261103-20261117:1", "00126380:I:20261103-20261117:1"]);
    assert.deepEqual([r.fullStocks, r.refreshStocks], [0, 2]);
    assert.deepEqual(h.marks, ["005930", "069500"]);
  });

  it("IR · 예고 본문 — 읽으면 ok, 양식이 다르면 unparsed, 실패는 세 번째에 failed(그 전엔 다시)", async () => {
    const h = harness({
      synced: { "005930": NOW, "000660": NOW, "069500": NOW },
      pending: [{ rceptNo: "ir1", kind: "ir", attempts: 0 }, { rceptNo: "pv1", kind: "preview", attempts: 0 }, { rceptNo: "x1", kind: "ir", attempts: 0 }, { rceptNo: "x2", kind: "ir", attempts: 2 }, { rceptNo: "gone1", kind: "ir", attempts: 0 }],
      docs: { pv1: ["결산실적공시 예고(안내공시)"] },
      fail: ["x1", "x2"],
    });
    const r = await h.uc().execute();
    // 014(파일 없음)는 첫 시도에 끝 — 다시 불러도 같은 답
    assert.deepEqual(h.docResults.map((d) => [d.rceptNo, d.status]), [["ir1", "ok"], ["pv1", "unparsed"], ["x1", null], ["x2", "failed"], ["gone1", "failed"]]);
    assert.equal(h.docResults[0]?.schedule?.scheduledAt.toISOString(), "2026-11-20T07:00:00.000Z");
    assert.equal(h.docResults[0]?.schedule?.aboutEarnings, true);
    assert.deepEqual([r.docs, r.parsed, r.unparsed, r.failed], [5, 1, 1, 3]);
    // 본문은 최근 1년 접수만(과거 IR 은 일정으로 안 쓴다)
    assert.equal(h.sinceSeen[0]?.toISOString(), "2025-11-17T03:00:00.000Z");
  });

  it("한 종목 목록 실패는 그 종목만 — 표시하지 않아 다음 회차에 다시", async () => {
    const h = harness({});
    const listByCorp = h.dart.listByCorp.bind(h.dart);
    h.dart.listByCorp = async (corp, ...rest) => {
      if (corp === "00126380") throw new Error("DART 020");
      return listByCorp(corp, ...rest);
    };
    await h.uc().execute();
    assert.deepEqual(h.marks, ["000660", "069500"]);
  });
});

describe("CollectDartDisclosures → 실적 표", () => {
  it("5분 회차가 잠정실적 · IR 을 처음 본 시각으로 실적 표에도 넣는다(유니버스만 · 실적 무관은 빼고)", async () => {
    const h = harness({});
    h.dart.list = async (type) => ({
      items: type === "I" ? [filing("i1", "005930", "영업(잠정)실적(공정공시)"), filing("i2", "000660", "기업설명회(IR)개최(안내공시)"), filing("i3", "999999", "영업(잠정)실적(공정공시)"), filing("i4", "005930", "단일판매ㆍ공급계약체결")] : [],
      totalPage: 1,
    });
    const bodies = { statuses: async () => new Map(), saveDisclosures: async () => 0 } as never;
    const filings = { save: async () => 0, backfilled: async () => new Set(["005930", "000660"]), markBackfilled: async () => {}, withoutBody: async () => [], recent: async () => [] };
    const uc = new CollectDartDisclosures({ dart: h.dart, universe: { codes: async () => ["005930", "000660"] }, bodies, filings, earnings: h.store }, () => NOW, async () => {});
    await uc.execute();
    assert.deepEqual(h.saved.map((s) => [s.rceptNo, s.kind, s.type]), [["i1", "earnings", "I"], ["i2", "ir", "I"]]);
  });
});

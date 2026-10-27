import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isKrRateLimited,
  isSettledInvestorDay,
  latestInvestorSettleAt,
  parseKrSummaryIndices,
  type KrInvestorFlowFact,
  type KrMarketCalendarStore,
  type KrSupplementPort,
  type KrSupplementStore,
  type KrStockStore,
} from "../../domain";
import { GetKrInvestorFlows } from "../ReadKrStock";
import type { ResolveKrStockUniverse } from "../SyncKrStock";
import { PollKrIndices, SyncKrInvestorFlows } from "../SyncKrSupplement";

/** F011 슬라이스 6 — 지수 요약(FR-49) · 투자자 순매수(FR-50) · 한도 양보(FR-91) */

const net = (quantity: number, value: number) => ({ quantity: BigInt(quantity), value });
const flow = (date: string, v = 1): KrInvestorFlowFact => ({
  date,
  individual: net(v, v * 1_000_000),
  foreign: net(-v, -v * 1_000_000),
  institution: net(0, 0),
});
const calendar = (open: boolean | null): KrMarketCalendarStore => ({
  upsertDays: async () => {},
  daysFromDailyCandles: async () => [],
  days: async (from) =>
    open === null ? [] : [{ date: from, isOpen: open, isTradingDay: open, isBusinessDay: open, isSettlementDay: open }],
});
const rateLimited = Object.assign(new Error("KIS 초과"), { msgCode: "EGW00201" });

describe("지수 설정 · 당일 확정 · 한도 판정", () => {
  it("설정 순서를 지키고 모르는 코드 · 중복은 버린다", () => {
    assert.deepEqual(parseKrSummaryIndices("1001, 0001,9999,1001"), ["1001", "0001"]);
    assert.deepEqual(parseKrSummaryIndices(""), []);
  });

  it("당일 행은 18:00 KST 뒤에만 확정으로 본다", () => {
    assert.equal(isSettledInvestorDay("2026-10-26", new Date("2026-10-26T08:59:00Z")), false); // 17:59 KST
    assert.equal(isSettledInvestorDay("2026-10-26", new Date("2026-10-26T09:00:00Z")), true); // 18:00 KST
    assert.equal(isSettledInvestorDay("2026-10-23", new Date("2026-10-26T01:00:00Z")), true);
  });

  it("한도 초과는 메시지 코드로만 안다", () => {
    assert.equal(isKrRateLimited(rateLimited), true);
    assert.equal(isKrRateLimited(new Error("x")), false);
    assert.equal(isKrRateLimited(null), false);
  });
});

const flowsSetup = (opts: { open?: boolean | null; failOn?: Record<string, Error>; at?: string; done?: string[] }) => {
  const asked: string[] = [];
  const saved = new Map<string, KrInvestorFlowFact[]>();
  const sinceAsked: string[] = [];
  const kis = {
    investorFlows: async (code: string) => {
      asked.push(code);
      const error = opts.failOn?.[code];
      if (error) throw error;
      return [flow("2026-10-26"), flow("2026-10-23")];
    },
  } as unknown as KrSupplementPort;
  const store = {
    upsertInvestorFlows: async (code: string, rows: KrInvestorFlowFact[]) => void saved.set(code, rows),
    investorFlowCodesCollectedSince: async (since: Date) => {
      sinceAsked.push(since.toISOString());
      return opts.done ?? [];
    },
  } as unknown as KrSupplementStore;
  const universe = { execute: async () => ["005930", "000660", "035420"] } as unknown as ResolveKrStockUniverse;
  const at = opts.at ?? "2026-10-26T09:40:00Z"; // 18:40 KST
  const sync = new SyncKrInvestorFlows(kis, store, calendar(opts.open ?? true), universe, () => new Date(at));
  return { sync, asked, saved, sinceAsked };
};

describe("SyncKrInvestorFlows", () => {
  it("유니버스 종목마다 받아 저장한다", async () => {
    const { sync, saved } = flowsSetup({});
    const r = await sync.execute();
    assert.equal(r.skipped, false);
    assert.deepEqual([...saved.keys()], ["005930", "000660", "035420"]);
    assert.equal(saved.get("005930")!.length, 2);
  });

  it("18:00 전에 돌면 당일 잠정 행은 버린다", async () => {
    const { sync, saved } = flowsSetup({ at: "2026-10-26T07:00:00Z" }); // 16:00 KST
    await sync.execute();
    assert.deepEqual(saved.get("005930")!.map((f) => f.date), ["2026-10-23"]);
  });

  it("한도 초과를 만나면 회차를 접는다 — 뒤 종목은 부르지 않는다(FR-91)", async () => {
    const { sync, asked, saved } = flowsSetup({ failOn: { "000660": rateLimited } });
    const r = await sync.execute();
    assert.deepEqual(asked, ["005930", "000660"]);
    assert.deepEqual([...saved.keys()], ["005930"]);
    assert.equal(r.skipped === false && r.yielded, true);
  });

  it("다른 실패는 그 종목만 건너뛴다", async () => {
    const { sync, asked, saved } = flowsSetup({ failOn: { "000660": new Error("500") } });
    await sync.execute();
    assert.equal(asked.length, 3);
    assert.deepEqual([...saved.keys()], ["005930", "035420"]);
  });

  it("같은 확정(18:00) 뒤에 받은 종목은 건너뛴다 — 양보한 회차를 다음 회차가 이어 받는다(6b)", async () => {
    const { sync, asked, sinceAsked } = flowsSetup({ done: ["005930"], at: "2026-10-26T12:40:00Z" }); // 21:40 KST
    await sync.execute();
    assert.deepEqual(asked, ["000660", "035420"]);
    assert.deepEqual(sinceAsked, ["2026-10-26T09:00:00.000Z"]);
  });

  it("다 받았으면 KIS 를 부르지 않는다", async () => {
    const { sync, asked } = flowsSetup({ done: ["005930", "000660", "035420"] });
    const r = await sync.execute();
    assert.equal(r.skipped, true);
    assert.deepEqual(asked, []);
  });

  it("놓친 회차를 다음 날 아침에 따라 돌면 기준은 전날 18:00 이다", () => {
    assert.equal(latestInvestorSettleAt(new Date("2026-10-26T23:30:00Z")).toISOString(), "2026-10-26T09:00:00.000Z"); // 10-27 08:30 KST
    assert.equal(latestInvestorSettleAt(new Date("2026-10-26T09:00:00Z")).toISOString(), "2026-10-26T09:00:00.000Z");
  });

  it("휴장일엔 부르지 않는다 · 달력을 모르면 받는다", async () => {
    const closed = flowsSetup({ open: false });
    assert.equal((await closed.sync.execute()).skipped, true);
    assert.deepEqual(closed.asked, []);
    const unknown = flowsSetup({ open: null });
    assert.equal((await unknown.sync.execute()).skipped, false);
  });
});

const indexSetup = (stored: string[], at: string, failOn?: Error) => {
  const asked: string[] = [];
  const kis = {
    indexQuote: async (code: string) => {
      asked.push(code);
      if (failOn) throw failOn;
      return { code, value: 1, change: 0, changeRate: 0, advancers: null, unchanged: null, decliners: null };
    },
  } as unknown as KrSupplementPort;
  const store = {
    indexQuotes: async (codes: string[]) => stored.filter((c) => codes.includes(c)).map((code) => ({ code })),
    upsertIndexQuotes: async () => {},
  } as unknown as KrSupplementStore;
  return { poll: new PollKrIndices(kis, store, calendar(true), ["0001", "1001"], () => new Date(at)), asked };
};

// 2026-10-26(월) 21:00 KST · 10:00 KST
const NIGHT = "2026-10-26T12:00:00Z";
const REGULAR = "2026-10-26T01:00:00Z";

describe("PollKrIndices", () => {
  it("장 밖엔 기동 회차 한 번 뒤 저장값이 없는 지수만 받는다", async () => {
    const { poll, asked } = indexSetup(["0001"], NIGHT);
    await poll.execute();
    assert.deepEqual(asked, ["0001", "1001"]);
    asked.length = 0;
    await poll.execute();
    assert.deepEqual(asked, ["1001"]);
  });

  it("정규장엔 매 회차 전부", async () => {
    const { poll, asked } = indexSetup(["0001", "1001"], REGULAR);
    await poll.execute();
    await poll.execute();
    assert.equal(asked.length, 4);
  });

  it("한도 초과면 남은 지수를 부르지 않는다", async () => {
    const { poll, asked } = indexSetup([], REGULAR, rateLimited);
    const r = await poll.execute();
    assert.deepEqual(asked, ["0001"]);
    assert.equal(r.skipped === false && r.failed, 1);
  });

  it("지수 설정이 비면 아무것도 안 한다", async () => {
    const kis = {} as KrSupplementPort;
    const poll = new PollKrIndices(kis, {} as KrSupplementStore, calendar(true), []);
    assert.equal((await poll.execute()).skipped, true);
  });
});

describe("GetKrInvestorFlows", () => {
  const read = (rows: KrInvestorFlowFact[], listed = true) =>
    new GetKrInvestorFlows({
      store: { findListing: async (code: string) => (listed ? { code, name: "x", market: "KOSPI" } : null) } as unknown as KrStockStore,
      calendar: calendar(true),
      viewerEmails: ["owner@x.com"],
      provider: () => ({ status: "ok", since: null, lastSuccessAt: null, realtime: { state: "idle", subscribed: 0, lastTickAt: null } }),
      supplement: { investorFlows: async () => ({ rows, collectedAt: rows.length ? new Date("2026-10-26T09:40:00Z") : null }) } as unknown as KrSupplementStore,
      summaryIndices: [],
    });
  const owner = { userId: "u", email: "owner@x.com" };

  it("기간 합계를 서버가 낸다 · 수량은 문자열 · 금액은 원 정수", async () => {
    const r = await read([flow("2026-10-26", 2), flow("2026-10-23", 3)]).execute(owner, "005930", 20);
    assert.deepEqual(r.totals!.individual, { quantity: "5", value: 5_000_000 });
    assert.deepEqual(r.totals!.foreign, { quantity: "-5", value: -5_000_000 });
    assert.equal(r.rows[0]!.date, "2026-10-26");
    assert.equal(r.days, 2);
  });

  it("아직 안 모였으면 합계는 null — 0 을 순매수 0 으로 읽게 두지 않는다", async () => {
    const r = await read([]).execute(owner, "005930", 20);
    assert.equal(r.totals, null);
    assert.equal(r.collectedAt, null);
  });

  it("비소유자 · 마스터에 없는 종목은 404 하나", async () => {
    await assert.rejects(read([]).execute({ userId: "u", email: "other@x.com" }, "005930", 20));
    await assert.rejects(read([], false).execute(owner, "005930", 20));
  });
});

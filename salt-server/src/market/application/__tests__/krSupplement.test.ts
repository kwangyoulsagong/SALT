import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isKrAfterHoursPollMinute,
  isKrRateLimited,
  krAfterHoursVisible,
  krMarketSession,
  isSettledInvestorDay,
  KrStockNotAvailableError,
  latestInvestorSettleAt,
  parseKrSummaryIndices,
  type KrInvestorFlowFact,
  type KrMarketCalendarStore,
  type KrOrderbookFact,
  type KrSupplementPort,
  type KrSupplementStore,
  type KrStockStore,
  KR_ORDERBOOK_STALE_MS,
  KR_ORDERBOOK_WAIT_MS,
} from "../../domain";
import { GetKrInvestorFlows, GetKrOrderbook } from "../ReadKrStock";
import type { ResolveKrStockUniverse } from "../SyncKrStock";
import { PollKrAfterHours, PollKrIndices, SyncKrInvestorFlows } from "../SyncKrSupplement";

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
  const ticks: string[] = [];
  const kis = {
    indexQuote: async (code: string) => {
      asked.push(code);
      if (failOn) throw failOn;
      return {
        code, value: 1, change: 0, changeRate: 0, advancers: null, unchanged: null, decliners: null, high: null, low: null, tradeValue: null,
      };
    },
  } as unknown as KrSupplementPort;
  const store = {
    indexQuotes: async (codes: string[]) => stored.filter((c) => codes.includes(c)).map((code) => ({ code })),
    upsertIndexQuotes: async () => {},
    appendIndexTicks: async (facts: Array<{ code: string }>) => {
      ticks.push(...facts.map((f) => f.code));
    },
  } as unknown as KrSupplementStore;
  return { poll: new PollKrIndices(kis, store, calendar(true), ["0001", "1001"], () => new Date(at)), asked, ticks };
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

  it("분 기록(DB-REQ-035)은 정규장 회차만 쌓는다 — 장 밖 기동 회차는 지수 행만", async () => {
    const night = indexSetup([], NIGHT);
    await night.poll.execute();
    assert.deepEqual(night.ticks, []);
    const day = indexSetup([], REGULAR);
    await day.poll.execute();
    assert.deepEqual(day.ticks, ["0001", "1001"]);
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
      provider: () => ({ status: "ok", since: null, lastSuccessAt: null, realtime: { state: "idle", subscribed: 0, lastTickAt: null } }),
      supplement: { investorFlows: async () => ({ rows, collectedAt: rows.length ? new Date("2026-10-26T09:40:00Z") : null }) } as unknown as KrSupplementStore,
      summaryIndices: [],
      orderbookSource: { orderbook: async () => assert.fail("호가를 부르지 않는다") },
    });

  it("기간 합계를 서버가 낸다 · 수량은 문자열 · 금액은 원 정수", async () => {
    const r = await read([flow("2026-10-26", 2), flow("2026-10-23", 3)]).execute("005930", 20);
    assert.deepEqual(r.totals!.individual, { quantity: "5", value: 5_000_000 });
    assert.deepEqual(r.totals!.foreign, { quantity: "-5", value: -5_000_000 });
    assert.equal(r.rows[0]!.date, "2026-10-26");
    assert.equal(r.days, 2);
  });

  it("아직 안 모였으면 합계는 null — 0 을 순매수 0 으로 읽게 두지 않는다", async () => {
    const r = await read([]).execute("005930", 20);
    assert.equal(r.totals, null);
    assert.equal(r.collectedAt, null);
  });

  it("읽는 사람을 받지 않는다(소유자 판정 없음, ADR-011) — 마스터에 없는 종목만 404", async () => {
    assert.equal(GetKrInvestorFlows.prototype.execute.length, 2);
    await assert.rejects(read([], false).execute("005930", 20), KrStockNotAvailableError);
  });
});

describe("GetKrOrderbook (FR-28 · 슬라이스 6b)", () => {
  const book: KrOrderbookFact = {
    code: "005930",
    asks: [{ price: 223_500, quantity: 20_134n }],
    bids: [{ price: 223_000, quantity: 53_870n }],
    totalAskQuantity: 703_049n,
    totalBidQuantity: 457_349n,
    at: new Date("2026-10-27T01:11:45Z"),
  };
  const setup = (fail: () => boolean = () => false, listed = true, hold?: Promise<void>) => {
    let t = Date.parse("2026-10-27T01:12:00Z");
    let calls = 0;
    const read = new GetKrOrderbook({
      store: { findListing: async (code: string) => (listed ? { code, name: "x", market: "KOSPI" } : null) } as unknown as KrStockStore,
      calendar: calendar(true),
      provider: () => ({ status: "ok", since: null, lastSuccessAt: null, realtime: { state: "idle", subscribed: 0, lastTickAt: null } }),
      supplement: {} as KrSupplementStore,
      summaryIndices: [],
      orderbookSource: {
        orderbook: async () => {
          calls++;
          if (hold) await hold;
          if (fail()) throw rateLimited;
          return book;
        },
      },
      now: () => new Date(t),
    });
    return { read, calls: () => calls, advance: (ms: number) => void (t += ms) };
  };

  it("가격은 원 정수 · 잔량은 문자열 · 1단계부터", async () => {
    const { read } = setup();
    const r = await read.execute("005930");
    assert.equal(r.available, true);
    assert.deepEqual(r.asks, [{ price: 223_500, quantity: "20134" }]);
    assert.equal(r.totalBidQuantity, "457349");
    assert.equal(r.at, "2026-10-27T01:11:45.000Z");
    assert.equal(r.stale, false);
  });

  const settle = () => new Promise((resolve) => setImmediate(resolve));

  it("10초 안 · 같은 순간 겹친 요청은 KIS 한 번", async () => {
    const { read, calls, advance } = setup();
    await Promise.all([read.execute("005930"), read.execute("005930")]);
    advance(9_000);
    await read.execute("005930");
    assert.equal(calls(), 1);
    advance(1_000);
    await read.execute("005930");
    await settle();
    assert.equal(calls(), 2);
  });

  it("받아 둔 값이 있으면 KIS 를 기다리지 않는다 — 낡은 값을 바로 주고 뒤에서 새로 받는다(SRV-REQ-053 FR-3)", async () => {
    let release!: () => void;
    let held = false;
    const gate = new Promise<void>((r) => (release = r));
    const { read, calls, advance } = setup(() => false, true, { then: (ok: () => void) => (held ? gate.then(ok) : ok()) } as Promise<void>);
    await read.execute("005930");
    held = true; // 이제부터 KIS 가 영영 답하지 않는다
    advance(10_000);
    const r = await read.execute("005930");
    assert.deepEqual([r.available, r.pending, r.stale], [true, false, false]);
    assert.equal(calls(), 2);
    release();
  });

  it("처음 보는 종목은 상한까지만 기다리고 pending — 받던 호출이 끝나면 캐시를 채운다", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    let release!: () => void;
    const { read, calls } = setup(() => false, true, new Promise<void>((r) => (release = r)));
    const waiting = read.execute("005930");
    await settle();
    t.mock.timers.tick(KR_ORDERBOOK_WAIT_MS);
    const r = await waiting;
    assert.deepEqual([r.available, r.pending, r.stale, r.asks.length], [false, true, false, 0]);
    release();
    await settle();
    const next = await read.execute("005930");
    assert.deepEqual([next.available, next.pending], [true, false]);
    assert.equal(calls(), 1);
  });

  it("뒤 갱신이 실패하면 다음 응답부터 stale · 30초 넘게 낡아도 stale · 처음부터 실패면 빈 호가(500 아님)", async () => {
    let failing = false;
    const { read, advance } = setup(() => failing);
    await read.execute("005930");
    failing = true;
    advance(10_000);
    const first = await read.execute("005930");
    assert.deepEqual([first.available, first.stale], [true, false]);
    await settle();
    const stale = await read.execute("005930");
    assert.deepEqual([stale.available, stale.stale, stale.asks.length], [true, true, 1]);

    const old = setup(() => false);
    await old.read.execute("005930");
    old.advance(KR_ORDERBOOK_STALE_MS);
    assert.equal((await old.read.execute("005930")).stale, true);

    const empty = await setup(() => true).read.execute("005930");
    assert.deepEqual([empty.available, empty.pending, empty.stale, empty.asks.length, empty.totalAskQuantity], [false, false, true, 0, null]);
  });

  it("읽는 사람을 받지 않는다(ADR-011) · 마스터에 없는 종목만 404 — KIS 를 부르지 않는다", async () => {
    assert.equal(GetKrOrderbook.prototype.execute.length, 1);
    const unlisted = setup(() => false, false);
    await assert.rejects(unlisted.read.execute("005930"), KrStockNotAvailableError);
    assert.equal(unlisted.calls(), 0);
  });
});

describe("시간외 단일가 (FR-27 · 슬라이스 6b)", () => {
  // 2026-10-26(월) · 10-27(화) 개장
  const open = new Map([["2026-10-23", true], ["2026-10-26", true], ["2026-10-27", true], ["2026-10-28", true]]);
  const sessionAt = (iso: string) => krMarketSession(new Date(iso), open);
  const kstIso = (hm: string, date = "2026-10-27") => new Date(`${date}T${hm}:00+09:00`).toISOString();

  it("16:11 … 18:01 10분마다만 받는다", () => {
    const due = (hm: string) => isKrAfterHoursPollMinute(new Date(kstIso(hm)), sessionAt(kstIso(hm)));
    assert.deepEqual(["16:01", "16:10", "16:11", "17:21", "18:01", "18:11", "15:51"].map(due), [false, false, true, true, true, false, false]);
  });

  it("휴장일 · 주말엔 받지 않는다", () => {
    const sat = kstIso("16:11", "2026-10-31");
    assert.equal(isKrAfterHoursPollMinute(new Date(sat), sessionAt(sat)), false);
  });

  it("마지막 정규장 마감 뒤에 받은 것만 보이고, 다음 정규장이 열리면 숨는다", () => {
    const q = { price: 223_500, change: 500, changeRate: 0.22, volume: 1_000n, at: new Date(kstIso("17:01")) };
    assert.equal(krAfterHoursVisible(q, sessionAt(kstIso("20:00"))), q);
    assert.equal(krAfterHoursVisible(q, sessionAt(kstIso("08:40", "2026-10-28"))), q); // 장전 — 아직 마지막 값
    assert.equal(krAfterHoursVisible(q, sessionAt(kstIso("09:01", "2026-10-28"))), null);
    // 어제 시간외는 오늘 마감 뒤에 숨는다
    assert.equal(krAfterHoursVisible({ ...q, at: new Date(kstIso("17:01", "2026-10-26")) }, sessionAt(kstIso("16:30"))), null);
  });

  const pollSetup = (iso: string, results: Record<string, "trade" | "none" | Error>) => {
    const asked: string[] = [];
    let written: unknown[] = [];
    const kis = {
      afterHoursQuote: async (code: string) => {
        asked.push(code);
        const r = results[code];
        if (r instanceof Error) throw r;
        return r === "trade" ? { code, price: 1000, change: 10, changeRate: 1, volume: 5n } : null;
      },
    } as unknown as KrSupplementPort;
    const store = { upsertAfterHours: async (facts: unknown[]) => void (written = facts) } as unknown as KrSupplementStore;
    const universe = { execute: async () => Object.keys(results) } as unknown as ResolveKrStockUniverse;
    const cal = { ...calendar(true), days: async (from: string, to: string) => [...open].filter(([d]) => d >= from && d <= to).map(([date, isOpen]) => ({ date, isOpen, isTradingDay: isOpen, isBusinessDay: isOpen, isSettlementDay: isOpen })) } as KrMarketCalendarStore;
    const poll = new PollKrAfterHours(kis, store, cal, universe, () => new Date(iso));
    return { poll, asked, written: () => written };
  };

  it("체결 없는 종목은 쓰지 않는다 · 한도 초과면 회차를 접는다", async () => {
    const { poll, asked, written } = pollSetup(kstIso("16:21"), { "005930": "trade", "000660": "none", "035420": rateLimited, "051910": "trade" });
    const r = await poll.execute();
    assert.equal(r.skipped === false && r.yielded, true);
    assert.deepEqual(asked, ["005930", "000660", "035420"]);
    assert.equal(written().length, 1);
  });

  it("받을 분이 아니면 KIS 를 부르지 않는다", async () => {
    const { poll, asked } = pollSetup(kstIso("16:25"), { "005930": "trade" });
    assert.equal((await poll.execute()).skipped, true);
    assert.deepEqual(asked, []);
  });
});

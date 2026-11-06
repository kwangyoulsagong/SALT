import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  KrMarketAction,
  KrMarketCalendarStore,
  KrMarketStatusPort,
  KrMarketStatusStore,
  KrSupplementStore,
  KrViEventFact,
} from "../../domain";
import { InferKrMarketActions, PollKrViEvents } from "../SyncKrMarketStatus";

/** F016 단계 A — VI 현황 수집 · 서킷브레이커 추정(SRV-REQ-051 FR-2 · 3) */

const calendar = (open: boolean): KrMarketCalendarStore => ({
  upsertDays: async () => {},
  daysFromDailyCandles: async () => [],
  // 요청 범위의 날마다 같은 값 — 장 상태 계산이 앞뒤 날도 읽는다
  days: async (from, to) => {
    const out = [];
    for (let d = new Date(`${from}T00:00:00Z`); d.toISOString().slice(0, 10) <= to; d = new Date(d.getTime() + 86_400_000)) {
      const date = d.toISOString().slice(0, 10);
      out.push({ date, isOpen: open, isTradingDay: open, isBusinessDay: open, isSettlementDay: open });
    }
    return out;
  },
});
const kst = (hm: string, date = "2026-11-06") => new Date(`${date}T${hm}:00+09:00`);
const vi = (code: string, hm: string): KrViEventFact => ({
  code, triggeredAt: kst(hm), releasedAt: null, kind: "dynamic", triggerPrice: 1000, staticGapRate: null, dynamicGapRate: 6, count: 1,
});
const rateLimited = Object.assign(new Error("KIS 초과"), { msgCode: "EGW00201" });

const statusStore = () => {
  const saved: { vi: KrViEventFact[]; actions: KrMarketAction[] } = { vi: [], actions: [] };
  const store = {
    upsertViEvents: async (e: KrViEventFact[]) => void saved.vi.push(...e),
    upsertMarketActions: async (a: KrMarketAction[]) => void saved.actions.push(...a),
  } as unknown as KrMarketStatusStore;
  return { store, saved };
};

describe("PollKrViEvents — 쪽 넘기기는 다시 읽을 창(3분)까지만", () => {
  const run = async (pages: Array<{ events: KrViEventFact[]; hasMore: boolean } | Error>, at = kst("10:35"), open = true) => {
    const asked: boolean[] = [];
    const kis: KrMarketStatusPort = {
      viEventsPage: async (_date, continued) => {
        const page = pages[asked.length];
        asked.push(continued);
        if (page instanceof Error) throw page;
        return page!;
      },
    };
    const { store, saved } = statusStore();
    const result = await new PollKrViEvents(kis, store, calendar(open), () => at).execute();
    return { asked, saved, result };
  };

  it("첫 쪽의 가장 오래된 발동이 3분 앞보다 오래되면 거기서 멈춘다", async () => {
    const { asked, saved } = await run([{ events: [vi("A", "10:34"), vi("B", "10:31")], hasMore: true }]);
    assert.deepEqual(asked, [false]);
    assert.equal(saved.vi.length, 2);
  });

  it("쪽이 전부 3분 안이면 이어 받는다(tr_cont N) · 더 없으면 멈춘다", async () => {
    const { asked, saved } = await run([
      { events: [vi("A", "10:34"), vi("B", "10:33")], hasMore: true },
      { events: [vi("C", "10:33")], hasMore: false },
    ]);
    assert.deepEqual(asked, [false, true]);
    assert.equal(saved.vi.length, 3);
  });

  it("장 초반 몰림에도 4쪽에서 멈춘다", async () => {
    const page = { events: [vi("A", "10:34")], hasMore: true };
    const { asked } = await run([page, page, page, page, page, page]);
    assert.equal(asked.length, 4);
  });

  it("한도 초과면 그 회차를 접고 받은 쪽은 저장한다", async () => {
    const { saved, result } = await run([{ events: [vi("A", "10:34")], hasMore: true }, rateLimited]);
    assert.equal(saved.vi.length, 1);
    assert.equal(result.skipped, false);
  });

  it("정규장 밖(휴장 · 장 마감 뒤)은 부르지 않는다", async () => {
    assert.deepEqual((await run([], kst("10:35"), false)).asked, []);
    assert.deepEqual((await run([], kst("16:30"))).asked, []);
  });
});

describe("InferKrMarketActions — 오늘 분 기록만 · 전일 종가 = 현재 − 전일 대비", () => {
  const supplement = (points: Array<{ at: Date; value: number }>) =>
    ({
      indexQuotes: async () => [
        { code: "0001", value: 4987, change: -396.8, changeRate: -7.37, advancers: null, unchanged: null, decliners: null, high: null, low: null, tradeValue: null, updatedAt: kst("10:35") },
      ],
      latestSessionIndexTicks: async () => new Map([["0001", points]]),
    }) as unknown as KrSupplementStore;
  const flat = (date: string) => [
    { at: kst("09:03", date), value: 4911.91 },
    { at: kst("09:04", date), value: 4923.47 },
    { at: kst("09:05", date), value: 4923.47 },
    { at: kst("09:34", date), value: 5022.12 },
  ];

  it("2026-11-06 기록이면 코스피 1단계 한 건", async () => {
    const { store, saved } = statusStore();
    await new InferKrMarketActions(supplement(flat("2026-11-06")), store, calendar(true), () => kst("10:35")).execute();
    assert.deepEqual(saved.actions.map((a) => [a.market, a.stage, a.source]), [["KOSPI", 1, "inferred"]]);
  });

  it("마지막 기록이 어제 것이면(오늘 아직 분 기록 없음) 쓰지 않는다 — 어제 기록과 오늘 전일 종가를 섞지 않는다", async () => {
    const { store, saved } = statusStore();
    await new InferKrMarketActions(supplement(flat("2026-11-05")), store, calendar(true), () => kst("09:00")).execute();
    assert.equal(saved.actions.length, 0);
  });
});

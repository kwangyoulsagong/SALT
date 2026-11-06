import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isKrNewsPollMinute,
  isKrNewsPromo,
  krNewsKindOf,
  krSectorIndexCodeOf,
  type KrMarketCalendarStore,
  type KrMoveSourcePort,
  type KrMoveSourceStore,
  type KrNewsTitleFact,
  type KrProgramFlowFact,
  type KrStockStore,
} from "../../domain";
import { KrStockNotAvailableError } from "../../domain";
import { GetKrIntradayFlows, GetKrStockNews } from "../ReadKrStock";
import type { ResolveKrStockUniverse } from "../SyncKrStock";
import { PollKrNewsTitles, PollKrProgramFlows, PollKrSectorIndices, PruneKrMoveSources } from "../SyncKrMoveSources";

/** F016 단계 B — 시황/공시 제목 · 업종 지수 · 장중 프로그램 매매(SRV-REQ-051 FR-1 · 4 · 5) */

const kst = (hm: string, date = "2026-11-06") => new Date(`${date}T${hm}:00+09:00`);
const rateLimited = Object.assign(new Error("KIS 초과"), { msgCode: "EGW00201" });
const calendar = (open: boolean): KrMarketCalendarStore => ({
  upsertDays: async () => {},
  daysFromDailyCandles: async () => [],
  days: async (from, to) => {
    const out = [];
    for (let d = new Date(`${from}T00:00:00Z`); d.toISOString().slice(0, 10) <= to; d = new Date(d.getTime() + 86_400_000)) {
      const date = d.toISOString().slice(0, 10);
      out.push({ date, isOpen: open, isTradingDay: open, isBusinessDay: open, isSettlementDay: open });
    }
    return out;
  },
});
const universe = (codes: string[]) => ({ execute: async () => codes }) as unknown as ResolveKrStockUniverse;

describe("원천 판정 — 허용 · 거절 경계", () => {
  it("공시/시황 — 제공처 이름에 '공시'가 있으면 공시(2026-11-05 표본 `코스닥 공시` · `공시`)", () => {
    const table: Array<[string, "news" | "disclosure"]> = [
      ["코스닥 공시", "disclosure"],
      ["공시", "disclosure"],
      ["연합뉴스", "news"],
      ["인포스탁", "news"],
      ["", "news"],
    ];
    for (const [name, kind] of table) assert.equal(krNewsKindOf(name), kind, name);
  });

  it("광고성 — 패턴이 맞을 때만 · 패턴이 없으면 아무것도 거르지 않는다", () => {
    const patterns = [/!!|이 정보 하나로|리딩\s*방/i];
    assert.equal(isKrNewsPromo("시장 역전의 기회, 이 정보 하나로 결정!!", patterns), true);
    assert.equal(isKrNewsPromo("무료 리딩 방 모집", patterns), true);
    assert.equal(isKrNewsPromo("\"AI붕괴 아니다…수급 불안에 낙폭 확대\"", patterns), false);
    assert.equal(isKrNewsPromo("이 정보 하나로 결정!!", []), false);
  });

  it("업종 지수 코드 — 분류 없음(0000) · 시장 대표(x001) · 형식 틀림은 업종 몫 없음", () => {
    const table: Array<[string | null, string | null]> = [
      ["0027", "0027"],
      ["1009", "1009"],
      ["0021", "0021"],
      ["0000", null],
      ["0001", null],
      ["1001", null],
      ["2001", null],
      ["27", null],
      [null, null],
    ];
    for (const [input, out] of table) assert.equal(krSectorIndexCodeOf(input), out, String(input));
  });

  it("제목 회차 — KST 07~20시 짝수 분 · 그 밖은 정각 · 30분만", () => {
    const table: Array<[string, boolean]> = [
      ["06:59", false],
      ["06:30", true],
      ["07:00", true],
      ["07:01", false],
      ["12:42", true],
      ["19:58", true],
      ["20:00", true],
      ["20:02", false],
      ["23:30", true],
    ];
    for (const [hm, due] of table) assert.equal(isKrNewsPollMinute(kst(hm)), due, hm);
  });

});

const title = (serial: string, hm: string, codes: string[] = ["005930"], t = "제목"): KrNewsTitleFact => ({
  serial, providerCode: "6", providerName: "연합뉴스", publishedAt: kst(hm), title: t, categoryCode: "03", codes,
});

describe("PollKrNewsTitles — 시장 전체 한 번 · 이미 받은 시각까지만 쪽을 넘긴다", () => {
  const run = async (opts: { pages: Array<KrNewsTitleFact[] | Error>; latest: Date | null; at?: Date; force?: boolean }) => {
    const asked: Array<{ date: string; hhmmss: string } | null> = [];
    const saved: Array<KrNewsTitleFact & { kind: string; promo: boolean }> = [];
    const kis = {
      newsTitlesPage: async (before: { date: string; hhmmss: string } | null) => {
        const page = opts.pages[asked.length];
        asked.push(before);
        if (page instanceof Error) throw page;
        return page ?? [];
      },
    } as unknown as KrMoveSourcePort;
    const store = {
      latestNewsPublishedAt: async () => opts.latest,
      saveNewsTitles: async (facts: typeof saved) => {
        saved.push(...facts);
        return facts.length;
      },
    } as unknown as KrMoveSourceStore;
    const result = await new PollKrNewsTitles(kis, store, [/이 정보 하나로/], () => opts.at ?? kst("11:42")).execute({ force: opts.force });
    return { asked, saved, result };
  };

  it("첫 쪽이 이미 받은 시각까지 닿으면 한 쪽으로 끝 · 관련 종목 없는 제목은 저장하지 않는다 · 공시/광고성 판정을 붙인다", async () => {
    const { asked, saved } = await run({
      pages: [[title("3", "11:41"), title("2", "11:40", []), { ...title("1", "11:39"), providerName: "코스닥 공시", title: "이 정보 하나로" }]],
      latest: kst("11:39"),
    });
    assert.deepEqual(asked, [null]);
    assert.deepEqual(saved.map((s) => [s.serial, s.kind, s.promo]), [["3", "news", false], ["1", "disclosure", true]]);
  });

  it("빈 구간이 있으면 가장 오래된 행 시각(KST hhmmss)부터 다음 쪽 — 받은 시각에 닿으면 멈춘다", async () => {
    const { asked } = await run({
      pages: [[title("4", "11:41"), title("3", "11:40")], [title("3", "11:40"), title("2", "11:30")], [title("1", "11:20")]],
      latest: kst("11:35"),
    });
    assert.deepEqual(asked, [null, { date: "2026-11-06", hhmmss: "114000" }]);
  });

  it("표가 비었으면(첫 수집) 한 쪽만 — 지난 30일을 거슬러 받지 않는다", async () => {
    const { asked } = await run({ pages: [[title("2", "11:41")], [title("1", "11:00")]], latest: null });
    assert.equal(asked.length, 1);
  });

  it("같은 초에 쪽이 꽉 차 다음 쪽 시작이 같으면 멈춘다(무한 반복 0)", async () => {
    const page = [title("b", "11:40"), title("a", "11:40")];
    const { asked } = await run({ pages: [page, page, page, page, page], latest: kst("11:00") });
    assert.equal(asked.length, 2);
  });

  it("한도 초과면 받은 쪽만 저장하고 접는다", async () => {
    const { saved, asked } = await run({ pages: [[title("2", "11:41"), title("1", "11:30")], rateLimited], latest: kst("11:00") });
    assert.equal(asked.length, 2);
    assert.deepEqual(saved.map((s) => s.serial), ["2", "1"]);
  });

  it("회차가 아니면 부르지 않는다 · 기동 실행(force)은 부른다", async () => {
    assert.equal((await run({ pages: [], latest: null, at: kst("11:41") })).asked.length, 0);
    assert.equal((await run({ pages: [[]], latest: null, at: kst("11:41"), force: true })).asked.length, 1);
  });
});

describe("PollKrSectorIndices — 유니버스 업종만 · 지수 TR 그대로", () => {
  const run = async (at: Date, open = true, fail: Record<string, Error> = {}) => {
    const asked: string[] = [];
    const saved: unknown[] = [];
    const kis = {
      indexQuote: async (code: string) => {
        asked.push(code);
        if (fail[code]) throw fail[code];
        return { code, value: 100, change: -1, changeRate: -1, advancers: 1, unchanged: 0, decliners: 2, high: null, low: null, tradeValue: null };
      },
    } as unknown as KrMoveSourcePort;
    const store = {
      sectorIndexCodes: async () => new Map([["005930", "0027"], ["000660", "0027"], ["105560", "0021"]]),
      upsertSectorIndices: async (facts: unknown[]) => void saved.push(...facts),
    } as unknown as KrMoveSourceStore;
    await new PollKrSectorIndices(kis, store, calendar(open), universe(["005930", "000660", "105560"]), () => at).execute();
    return { asked, saved };
  };

  it("장 시간 창 — 업종 중복 없이 한 번씩 · 저장은 값 넷만(종목 수 칸은 안 씀)", async () => {
    const { asked, saved } = await run(kst("10:31"));
    assert.deepEqual(asked, ["0021", "0027"]);
    assert.deepEqual(saved[0], { code: "0021", value: 100, change: -1, changeRate: -1 });
  });

  it("장후 15:40 회차가 장 끝 값을 받는다 · 16:05 · 08:00 · 휴장은 0(박자는 cron)", async () => {
    assert.equal((await run(kst("15:40"))).asked.length, 2);
    assert.equal((await run(kst("16:05"))).asked.length, 0);
    assert.equal((await run(kst("08:00"))).asked.length, 0);
    assert.equal((await run(kst("10:31"), false)).asked.length, 0);
  });

  it("한도 초과면 그 자리에서 접고 받은 값은 저장한다", async () => {
    const { asked, saved } = await run(kst("10:31"), true, { "0027": rateLimited });
    assert.deepEqual(asked, ["0021", "0027"]);
    assert.equal(saved.length, 1);
  });
});

describe("PollKrProgramFlows — 장중만 · 오늘 체결만 · 한도 양보", () => {
  const fact = (code: string, at: Date): KrProgramFlowFact => ({
    code, at, netQuantity: 308365n, netValue: 60_550_831_650, buyValue: 1_058_390_942_900, sellValue: 997_840_111_250,
  });
  const run = async (at: Date, results: Record<string, KrProgramFlowFact | null | Error>) => {
    const asked: string[] = [];
    const saved: KrProgramFlowFact[] = [];
    const kis = {
      programFlow: async (code: string) => {
        asked.push(code);
        const r = results[code];
        if (r instanceof Error) throw r;
        return r ?? null;
      },
    } as unknown as KrMoveSourcePort;
    const store = { appendProgramFlows: async (f: KrProgramFlowFact[]) => void saved.push(...f) } as unknown as KrMoveSourceStore;
    const result = await new PollKrProgramFlows(kis, store, calendar(true), universe(Object.keys(results)), () => at).execute();
    return { asked, saved, result };
  };

  it("어제 체결 행(장 전 응답)은 버린다 · 체결 없음(null)은 건너뛴다", async () => {
    const { saved } = await run(kst("10:30"), {
      "005930": fact("005930", kst("10:29")),
      "000660": fact("000660", kst("15:30", "2026-11-05")),
      "035420": null,
    });
    assert.deepEqual(saved.map((s) => s.code), ["005930"]);
  });

  it("초과 한 건은 그 종목만 건너뛴다 — 장중 초과율이 높아 첫 종목에서 접으면 매 회차 0행이었다(2026-11-06 13:10)", async () => {
    const { asked, saved, result } = await run(kst("10:30"), { a1: rateLimited, b2: fact("b2", kst("10:29")), c3: fact("c3", kst("10:29")) });
    assert.deepEqual(asked, ["a1", "b2", "c3"]);
    assert.deepEqual(saved.map((s) => s.code), ["b2", "c3"]);
    assert.equal(result.skipped === false && result.yielded, false);
  });

  it("연달아 셋이 초과면 남은 종목을 부르지 않고 양보한다 · 사이에 성공이 끼면 다시 센다", async () => {
    const r1 = await run(kst("10:30"), { a1: rateLimited, b2: rateLimited, c3: rateLimited, d4: fact("d4", kst("10:29")) });
    assert.deepEqual(r1.asked, ["a1", "b2", "c3"]);
    assert.equal(r1.result.skipped === false && r1.result.yielded, true);
    const r2 = await run(kst("10:30"), { a1: rateLimited, b2: rateLimited, c3: fact("c3", kst("10:29")), d4: rateLimited, e5: fact("e5", kst("10:29")) });
    assert.equal(r2.asked.length, 5);
  });

  it("늦게 시작한 회차(10:31)도 받는다 — 박자는 워커 cron 몫 · 장 밖이면 부르지 않는다", async () => {
    assert.equal((await run(kst("10:31"), { a1: null })).asked.length, 1);
    assert.equal((await run(kst("08:40"), { a1: null })).asked.length, 0);
  });
});

describe("PruneKrMoveSources — 보관 기한", () => {
  it("제목 30일 · 장중 수급 7일 · VI 30일 앞을 지운다", async () => {
    let cutoffs: { news: Date; flows: Date; viEvents: Date } | null = null;
    const store = {
      prune: async (c: typeof cutoffs) => {
        cutoffs = c;
        return { news: 0, flows: 0, viEvents: 0 };
      },
    } as unknown as KrMoveSourceStore;
    await new PruneKrMoveSources(store, () => new Date("2026-11-06T06:55:00Z")).execute();
    assert.equal(cutoffs!.news.toISOString(), "2026-10-07T06:55:00.000Z");
    assert.equal(cutoffs!.flows.toISOString(), "2026-10-30T06:55:00.000Z");
    assert.equal(cutoffs!.viEvents.toISOString(), "2026-10-07T06:55:00.000Z");
  });
});

describe("읽기 — 오늘 소식 · 장중 수급(소유자 전용 · 저장값만)", () => {
  const OWNER = { userId: "u", email: "owner@x.com" };
  const asked: Array<{ code: string; since: string }> = [];
  const deps = (listed = true) => ({
    store: { findListing: async (code: string) => (listed ? { code, name: "삼성전자", market: "KOSPI" } : null) } as unknown as KrStockStore,
    calendar: calendar(true),
    viewerEmails: ["owner@x.com"],
    provider: () => ({ status: "ok" as const, since: null, lastSuccessAt: null, realtime: { state: "idle", subscribed: 0, lastTickAt: null } }),
    supplement: {} as never,
    summaryIndices: [],
    status: {} as never,
    orderbookSource: { orderbook: async () => assert.fail("호가를 부르지 않는다") },
    moveSources: {
      newsTitles: async (code: string, since: Date) => {
        asked.push({ code, since: since.toISOString() });
        return [{ serial: "1", kind: "disclosure" as const, providerName: "코스닥 공시", publishedAt: kst("11:41"), title: "실적" }];
      },
      newsCollectedAt: async () => kst("11:42"),
      latestProgramFlow: async () => null,
    } as unknown as KrMoveSourceStore,
    now: () => kst("11:45"),
  });

  it("오늘 소식 — KST 00:00 뒤 · 본문 · 링크 칸 없음", async () => {
    const r = await new GetKrStockNews(deps() as never).execute(OWNER, "005930");
    assert.deepEqual(asked.at(-1), { code: "005930", since: "2026-11-05T15:00:00.000Z" });
    assert.deepEqual(Object.keys(r.items[0]!).sort(), ["id", "kind", "provider", "publishedAt", "title"]);
    assert.equal(r.collectedAt, "2026-11-06T02:42:00.000Z");
  });

  it("비소유자 · 마스터에 없는 종목은 같은 404", async () => {
    await assert.rejects(new GetKrStockNews(deps() as never).execute({ userId: "x", email: "other@x.com" }, "005930"), KrStockNotAvailableError);
    await assert.rejects(new GetKrIntradayFlows(deps(false) as never).execute(OWNER, "005930"));
  });

  it("장중 수급 — 오늘 값이 없으면 program null(0 으로 채우지 않는다)", async () => {
    const r = await new GetKrIntradayFlows(deps() as never).execute(OWNER, "005930");
    assert.equal(r.program, null);
  });
});

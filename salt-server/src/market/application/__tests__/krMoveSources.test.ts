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
import { KrArticleBodyUnavailableError, KrStockNotAvailableError } from "../../domain";
import { GetKrIntradayFlows, GetKrNewsBody, GetKrStockNews } from "../ReadKrStock";
import type { ResolveKrStockUniverse } from "../SyncKrStock";
import {
  BackfillKrIndexDaily,
  PollKrNewsTitles,
  PollKrProgramFlows,
  PollKrSectorIndices,
  PruneKrMoveSources,
  SupplementFailures,
} from "../SyncKrMoveSources";

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

  it("중분류가 있으면 중분류 — 대분류 '제조업'(0027)은 반도체가 지배해 제약사 업종 몫이 틀렸다(2026-11-09 동화약품 β −3.5)", () => {
    const table: Array<[string | null, string | null, string | null]> = [
      ["0027", "0013", "0013"], // 삼성전자 · SK하이닉스 — 전기전자
      ["0027", "0009", "0009"], // 동화약품 · 셀트리온 — 의약품
      ["1009", "1028", "1028"], // 코스닥 중분류
      ["0021", null, "0021"], // 중분류 없음 → 대분류(금융)
      ["0027", "0000", "0027"],
      ["0000", "0013", "0013"],
      ["0000", null, null],
      ["0001", "0001", null],
    ];
    for (const [big, mid, out] of table) assert.equal(krSectorIndexCodeOf(big, mid), out, `${big}/${mid}`);
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
    await new PollKrSectorIndices(kis, store, calendar(open), universe(["005930", "000660", "105560"]), () => at, async () => {}).execute();
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

  it("초과 한 건은 그 업종만 건너뛴다 — 2026-11-06 15:40 종가 회차가 첫 업종 초과 하나로 0행이었다(프로그램과 같은 규칙)", async () => {
    const { asked, saved } = await run(kst("15:40"), true, { "0021": rateLimited });
    assert.deepEqual(asked, ["0021", "0027"]);
    assert.deepEqual(saved.map((f) => (f as { code: string }).code), ["0027"]);
  });
});

describe("SupplementFailures — 부가 작업 셋(업종 · 프로그램 · 지수 일별)의 같은 실패 규칙", () => {
  const other = new Error("HTTP 500");
  it("초과는 연달아 셋에 양보 · 다른 실패는 연달아 다섯에 멈춤 · 성공이 끼면 다시 센다", () => {
    const table: Array<[Array<"rate" | "other" | "ok">, boolean, boolean]> = [
      [["rate", "rate"], false, false],
      [["rate", "rate", "rate"], true, true],
      [["rate", "rate", "ok", "rate", "rate"], false, false],
      [["other", "other", "other", "other"], false, false],
      [["other", "other", "other", "other", "other"], true, false],
      [["rate", "other", "rate", "other"], false, false],
    ];
    for (const [steps, stop, yielded] of table) {
      const c = new SupplementFailures();
      let stopped = false;
      for (const step of steps) {
        if (step === "ok") c.ok();
        else stopped = c.fail(step === "rate" ? rateLimited : other, "t");
      }
      assert.deepEqual([stopped, c.yielded], [stop, yielded], steps.join(","));
    }
  });
});

describe("BackfillKrIndexDaily — 지수 · 업종 일별(β 재료)", () => {
  /** 2026-11-06 부터 거슬러 평일만 n 거래일 종가(100 + 날짜 순번) */
  const weekdays = (to: string, n: number) => {
    const out: string[] = [];
    for (let d = new Date(`${to}T00:00:00Z`); out.length < n; d = new Date(d.getTime() - 86_400_000)) {
      if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) out.push(d.toISOString().slice(0, 10));
    }
    return out;
  };
  const all = weekdays("2026-11-06", 400);
  const run = async (have: Record<string, number>, fail: Record<string, Error> = {}, at = kst("16:05", "2026-11-09"), dates = all) => {
    const calls: Array<[string, string, string]> = [];
    const upserts = new Map<string, Array<{ tradeDate: string; changeRate: number }>>();
    const names: Array<{ code: string; name: string }> = [];
    const kis = {
      indexDailyCloses: async (code: string, from: string, to: string) => {
        calls.push([code, from, to]);
        if (fail[code]) throw fail[code];
        return {
          name: code === "0027" ? "제조" : null,
          closes: dates.filter((d) => d >= from && d <= to).slice(0, 50).map((tradeDate) => ({ tradeDate, close: 1000 + dates.length - dates.indexOf(tradeDate) })),
        };
      },
    } as unknown as KrMoveSourcePort;
    const store = {
      sectorIndexCodes: async () => new Map([["005930", "0027"], ["000660", "0027"]]),
      indexDailyCoverage: async (codes: string[]) =>
        new Map(codes.filter((c) => have[c]).map((c) => [c, { count: have[c]!, earliest: { tradeDate: "2025-11-01", close: 1 }, latest: { tradeDate: "2026-11-05", close: 1 } }])),
      upsertIndexDaily: async (code: string, rows: Array<{ tradeDate: string; changeRate: number }>) => void upserts.set(code, rows),
      upsertIndexNames: async (n: Array<{ code: string; name: string }>) => void names.push(...n),
    } as unknown as KrMoveSourceStore;
    const result = await new BackfillKrIndexDaily(kis, store, universe(["005930", "000660"]), () => at, async () => {}).execute();
    return { calls, upserts, result, names };
  };

  it("처음이면 지수 셋 + 업종(중복 없이)을 250 거래일 넘게 거슬러 받는다 — 쪽마다 앞 쪽의 가장 이른 날 하루 전까지", async () => {
    const { calls, upserts, names } = await run({});
    assert.deepEqual([...new Set(calls.map((c) => c[0]))], ["0001", "1001", "2001", "0027"]);
    assert.deepEqual(names, [{ code: "0027", name: "제조" }]); // 원천 이름 — 쪽마다가 아니라 지수마다 한 번
    const kospi = calls.filter((c) => c[0] === "0001");
    assert.equal(kospi.length, 5);
    assert.equal(kospi[0]![2], "2026-11-09");
    assert.equal(kospi[1]![2], "2026-08-30"); // 첫 쪽 가장 이른 날(평일 50일 앞 08-31) 하루 전
    assert.equal(upserts.get("0001")!.length, 249); // 받은 250 중 맨 앞 하나는 앞 종가가 없어 빠진다
  });

  it("이미 250 거래일이 있으면 지수마다 최근 한 쪽만 — 등락률은 바로 앞 거래일 종가 대비", async () => {
    const { calls, upserts } = await run({ "0001": 260, "1001": 260, "2001": 260, "0027": 260 });
    assert.equal(calls.length, 4);
    // 248행(원천 한 해 끝)도 한 쪽만 — 목표(250) 미만이라고 매일 깊게 넘기지 않는다(2026-11-09 95회). 200 미만이면 다시 거슬러
    assert.equal((await run({ "0001": 248, "1001": 248, "2001": 248, "0027": 248 })).calls.length, 4);
    assert.equal((await run({ "0001": 199, "1001": 248, "2001": 248, "0027": 248 })).calls.length, 8);
    const rows = upserts.get("0001")!;
    const last = rows[rows.length - 1]!;
    assert.equal(last.tradeDate, "2026-11-06");
    assert.ok(Math.abs(last.changeRate - (1400 / 1399 - 1) * 100) < 1e-9);
  });

  it("오늘 행은 16:00 KST 뒤에만 — 장 전 · 장중 응답의 오늘 행은 종가가 아니다(2026-11-09 08:43 기동 회차)", async () => {
    const withToday = ["2026-11-09", ...all];
    const have = { "0001": 260, "1001": 260, "2001": 260, "0027": 260 };
    const morning = (await run(have, {}, kst("08:43", "2026-11-09"), withToday)).upserts.get("0001")!;
    assert.equal(morning[morning.length - 1]!.tradeDate, "2026-11-06");
    const evening = (await run(have, {}, kst("16:05", "2026-11-09"), withToday)).upserts.get("0001")!;
    assert.equal(evening[evening.length - 1]!.tradeDate, "2026-11-09");
  });

  it("초과 한 건은 그 지수만 건너뛴다 · 다른 지수는 계속", async () => {
    const { upserts, result } = await run({ "0001": 260, "1001": 260, "2001": 260, "0027": 260 }, { "1001": rateLimited });
    assert.deepEqual([...upserts.keys()].sort(), ["0001", "0027", "1001", "2001"]);
    assert.equal(upserts.get("1001")!.length, 0);
    assert.equal(result.failed, 1);
  });
});

describe("PollKrProgramFlows — 장중만 · 오늘 체결만 · 한도 양보", () => {
  let lastPauses: number[] = [];
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
    const pauses: number[] = [];
    const result = await new PollKrProgramFlows(kis, store, calendar(true), universe(Object.keys(results)), () => at, async (ms) => void pauses.push(ms)).execute();
    lastPauses = pauses;
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

  it("종목 사이에 1초 — 부가 호출이 몰려 현재가까지 세우는 감속을 부르지 않게(첫 호출 앞엔 없음)", async () => {
    await run(kst("10:30"), { a1: null, b2: null, c3: null });
    assert.deepEqual(lastPauses, [1000, 1000]);
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
        return [{ serial: "1", kind: "disclosure" as const, providerName: "코스닥 공시", publishedAt: kst("11:41"), title: "실적", related: [{ code: "005930", name: "삼성전자", changeRate: -1.2 }, { code: "000660", name: "SK하이닉스", changeRate: null }] }];
      },
      newsCollectedAt: async () => kst("11:42"),
      latestProgramFlow: async () => null,
    } as unknown as KrMoveSourceStore,
    now: () => kst("11:45"),
  });

  it("오늘 소식 — KST 00:00 뒤 · 본문 · 링크 칸 없음", async () => {
    const r = await new GetKrStockNews(deps() as never).execute(OWNER, "005930");
    assert.deepEqual(asked.at(-1), { code: "005930", since: "2026-11-05T15:00:00.000Z" });
    assert.deepEqual(Object.keys(r.items[0]!).sort(), ["id", "kind", "provider", "publishedAt", "related", "title"]);
    // 관련 종목 칩(FE-REQ-065) — 이름 · 등락률 서버 값, 시세 없으면 null(0 으로 채우지 않는다)
    assert.deepEqual(r.items[0]!.related, [{ code: "005930", name: "삼성전자", changeRate: -1.2 }, { code: "000660", name: "SK하이닉스", changeRate: null }]);
    assert.equal(r.collectedAt, "2026-11-06T02:42:00.000Z");
  });

  it("기사 본문(SRV-REQ-054) — 그 종목 시황만 news 로 · 공시는 검색 없이 not_found · 남의 일련번호 · 형식 오류 404 · 원천 없음 503", async () => {
    const asks: Array<{ key: string; title: string }> = [];
    const titles: Record<string, { kind: "news" | "disclosure"; title: string; publishedAt: Date }> = {
      "20261109100000000001": { kind: "news", title: "삼성전자, 신규 라인 가동", publishedAt: kst("10:00") },
      "20261109100000000002": { kind: "disclosure", title: "주요사항보고서", publishedAt: kst("10:01") },
    };
    const base = deps();
    const withBody = (articleBody?: unknown) => ({
      ...base,
      moveSources: { ...base.moveSources, newsTitle: async (serial: string, code: string) => (code === "005930" ? titles[serial] ?? null : null) },
      articleBody,
    });
    const port = { read: async (q: { key: string; title: string }) => (asks.push(q), { status: "ok" as const, paragraphs: ["본문"], originalUrl: "https://press.example/1", fetchedAt: "t" }) };
    const run = (d: unknown, code: string, serial: string) => new GetKrNewsBody(d as never).execute(OWNER, code, serial);

    assert.deepEqual((await run(withBody(port), "005930", "20261109100000000001")).paragraphs, ["본문"]);
    assert.deepEqual(asks.map((a) => a.key), ["kr:20261109100000000001"]);
    assert.equal((await run(withBody(port), "005930", "20261109100000000002")).status, "not_found");
    assert.equal(asks.length, 1, "공시는 검색하지 않는다");
    await assert.rejects(run(withBody(port), "000660", "20261109100000000001"), KrStockNotAvailableError);
    await assert.rejects(run(withBody(port), "005930", "../etc"), KrStockNotAvailableError);
    await assert.rejects(run(withBody(undefined), "005930", "20261109100000000001"), KrArticleBodyUnavailableError);
    await assert.rejects(new GetKrNewsBody(withBody(port) as never).execute({ userId: "x", email: "other@x.com" }, "005930", "20261109100000000001"), KrStockNotAvailableError);
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

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import { KIS_PRIORITY, KIS_QUERY_TR, KisClient, assertQueryTr, maskKisSecrets } from "../KisClient";
import { parseMasterFile } from "../KisMasterFile";

describe("KIS 조회 TR 허용 목록 — 주문 · 계좌 경로 0건 (F011 FR-3 · 공통 수용 기준 2)", () => {
  it("우리가 부르는 TR 은 전부 허용 목록 규칙을 통과한다", () => {
    for (const trId of Object.values(KIS_QUERY_TR)) assert.doesNotThrow(() => assertQueryTr(trId));
  });

  it("주문(U 로 끝남) · 계좌 · 체결통보 TR 은 거부된다", () => {
    for (const trId of ["TTTC0012U", "TTTC0011U", "TTTC0013U", "TTTC8434R", "TTTC8908R", "VTTC0012U", "H0STCNI0", "H0STCNI9", "FHKST0101010U"]) {
      assert.throws(() => assertQueryTr(trId), /허용 목록 밖/, trId);
    }
  });

  it("레포 전체(테스트 · 문서 제외) 서버 · BFF · 프론트 · 예측 소스에 주문 · 계좌 TR 문자열이 0건이다", () => {
    const root = resolve(__dirname, "../../../../..");
    let hits = "";
    try {
      hits = execFileSync(
        "git",
        ["-C", root, "grep", "-nE", "\\b(TTTC|VTTC|TTTS|VTTS|CTSC)[0-9A-Z]{4,6}\\b", "--", "salt-server/src", "bff/src", "salt-microFe/apps", "salt-microFe/packages", "salt-forecast/src", ":!**/__tests__/**"],
        { encoding: "utf8" }
      );
    } catch (error) {
      // git grep 은 일치가 없으면 1 로 끝난다 — 그게 통과다
      if ((error as { status?: number }).status !== 1) throw error;
    }
    assert.equal(hits.trim(), "");
  });
});

describe("비밀값 마스킹 (FR-5)", () => {
  it("Bearer 토큰 · 앱 키 · 시크릿을 지운다", () => {
    const text = "fail appkey=PSabcdef123 secret=ZZsecretZZ authorization: Bearer eyJ.abc.def";
    const masked = maskKisSecrets(text, ["PSabcdef123", "ZZsecretZZ"]);
    assert.ok(!masked.includes("PSabcdef123"));
    assert.ok(!masked.includes("ZZsecretZZ"));
    assert.ok(!masked.includes("eyJ.abc.def"));
  });
});

describe("종목 마스터 고정폭 파서 (FR-10)", () => {
  it("KOSPI 한 줄 — 앞(코드 · 표준코드 · cp949 이름) + 뒤 227바이트", () => {
    const fields: string[] = [];
    const specs = [2, 1, 4, 4, 4, ...Array(26).fill(1), 9, 5, 5, 1, 1, 1, 2, 1, 1, 1, 2, 2, 2, 3, 1, 3, 12, 12, 8, 15, 21, 2, 7, 1, 1, 1, 1, 1, 9, 9, 9, 5, 9, 8, 9, 3, 1, 1, 1];
    const values: Record<number, string> = { 0: "ST", 2: "0027", 22: "0", 31: "000272000", 34: "N", 36: "N", 37: "00", 49: "19750611", 50: "000000005846278", 54: "0", 65: "015901877" };
    specs.forEach((w, i) => fields.push((values[i] ?? "").padEnd(w, " ").slice(0, w)));
    const tail = fields.join("");
    assert.equal(tail.length, 227);
    const head = Buffer.concat([Buffer.from("005930   KR7005930003"), Buffer.from([0xbb, 0xef, 0xbc, 0xba, 0xc0, 0xfc, 0xc0, 0xda]), Buffer.from("   ")]);
    const [row] = parseMasterFile("KOSPI", Buffer.concat([head, Buffer.from(tail, "latin1"), Buffer.from("\n")]));
    assert.equal(row.code, "005930");
    assert.equal(row.name, "삼성전자");
    assert.equal(row.basePrice, 272_000);
    assert.equal(row.sharesOutstanding, 5_846_278_000n);
    assert.equal(row.marketCap, 15_901_877 * 100_000_000);
    assert.equal(row.isHalted, false);
    assert.deepEqual(row.listedAt, new Date("1975-06-11T00:00:00Z"));
    assert.equal(row.isLiquidation, false);

    // 정리매매는 거래정지 다음 칸(35) — 관리종목(36)과 섞이지 않는다 (FC-REQ-020 FR-9)
    const flagged = tail.slice(0, 61) + "Y" + tail.slice(62);
    const [liq] = parseMasterFile("KOSPI", Buffer.concat([head, Buffer.from(flagged, "latin1"), Buffer.from("\n")]));
    assert.deepEqual([liq.isHalted, liq.isLiquidation, liq.isAdministrative], [false, true, false]);
  });
});

describe("KIS 상태 · 지표 (FR-92 · 94)", () => {
  // 호출 결과 집계만 본다 — 네트워크 없이 내부 기록 함수를 부른다
  const client = () => new KisClient({ appKey: "k", appSecret: "s", baseUrl: "http://127.0.0.1:9" });
  const rec = (c: KisClient, tr: string, outcome: "ok" | "fail" | "rate") =>
    (c as unknown as { record: (t: string, o: string) => void }).record(tr, outcome);

  it("진짜 실패 5회 연속이면 degraded, 성공 한 번이면 ok 로 돌아온다", () => {
    const c = client();
    for (let i = 0; i < 4; i++) rec(c, "FHKST01010100", "fail");
    assert.equal(c.snapshot().status, "ok");
    rec(c, "FHKST01010100", "fail");
    assert.equal(c.snapshot().status, "degraded");
    assert.ok(c.snapshot().since);
    rec(c, "FHKST01010100", "ok");
    assert.equal(c.snapshot().status, "ok");
    assert.equal(c.snapshot().consecutiveFailures, 0);
  });

  it("초과 응답은 장애로 세지 않는다 — 감속이 처리한다", () => {
    const c = client();
    for (let i = 0; i < 10; i++) rec(c, "FHKST01010100", "rate");
    assert.equal(c.snapshot().status, "ok");
  });

  it("지표는 TR 별로 세고 drain 하면 비워진다", () => {
    const c = client();
    rec(c, "FHKST01010100", "ok");
    rec(c, "FHKST01010100", "rate");
    rec(c, "FHKST03010100", "fail");
    const { byTr } = c.drainMetrics();
    assert.deepEqual(byTr.FHKST01010100, { calls: 2, failures: 0, rateLimited: 1 });
    assert.deepEqual(byTr.FHKST03010100, { calls: 1, failures: 1, rateLimited: 0 });
    assert.deepEqual(c.drainMetrics().byTr, {});
  });
});


describe("부가 조회 응답 해석 (슬라이스 6)", () => {
  const withBody = (body: unknown) => {
    const c = new KisClient({ appKey: "k", appSecret: "s", baseUrl: "http://127.0.0.1:9" });
    (c as unknown as { get: () => Promise<unknown> }).get = async () => body;
    return c;
  };

  it("투자자 순매수 금액은 백만 원 → 원, 빈 칸 행은 버린다", async () => {
    const rows = await withBody({
      output: [
        {
          stck_bsop_date: "20261026",
          prsn_ntby_qty: "357058",
          prsn_ntby_tr_pbmn: "75298",
          frgn_ntby_qty: "-1002291",
          frgn_ntby_tr_pbmn: "-213891",
          orgn_ntby_qty: "612382",
          orgn_ntby_tr_pbmn: "131614",
        },
        { stck_bsop_date: "20261027", prsn_ntby_qty: "", prsn_ntby_tr_pbmn: "", frgn_ntby_qty: "", frgn_ntby_tr_pbmn: "", orgn_ntby_qty: "", orgn_ntby_tr_pbmn: "" },
      ],
    }).investorFlows("005930");
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.date, "2026-10-26");
    assert.equal(rows[0]!.foreign.quantity, -1002291n);
    assert.equal(rows[0]!.foreign.value, -213_891_000_000);
  });

  it("지수는 부호 붙은 등락과 상승 · 보합 · 하락 종목 수를 그대로", async () => {
    const q = await withBody({
      output: { bstp_nmix_prpr: "5469.47", bstp_nmix_prdy_vrss: "-80.83", bstp_nmix_prdy_ctrt: "-1.46", ascn_issu_cnt: "101", stnr_issu_cnt: "22", down_issu_cnt: "792" },
    }).indexQuote("0001");
    assert.deepEqual(q, {
      code: "0001", value: 5469.47, change: -80.83, changeRate: -1.46, advancers: 101, unchanged: 22, decliners: 792,
      high: null, low: null, tradeValue: null,
    });
  });

  it("고가 · 저가는 포인트, 거래대금은 백만 원 → 원(SRV-REQ-042 · 2026-11-02 실측 필드)", async () => {
    const q = await withBody({
      output: {
        bstp_nmix_prpr: "5889.73", bstp_nmix_prdy_vrss: "158.99", bstp_nmix_prdy_ctrt: "2.77",
        bstp_nmix_hgpr: "5907.21", bstp_nmix_lwpr: "5616.50", acml_tr_pbmn: "11022338",
      },
    }).indexQuote("0001");
    assert.equal(q.high, 5907.21);
    assert.equal(q.low, 5616.5);
    assert.equal(q.tradeValue, 11_022_338_000_000);
  });
});

describe("호가 응답 해석 (FR-28 · 슬라이스 6b)", () => {
  const withBody = (body: unknown, now: string) => {
    const c = new KisClient({ appKey: "k", appSecret: "s", baseUrl: "http://127.0.0.1:9", now: () => new Date(now) });
    (c as unknown as { get: () => Promise<unknown> }).get = async () => body;
    return c;
  };
  // 2026-10-27 10:11:45 삼성전자 실측 응답의 앞 단계
  const output1 = {
    aspr_acpt_hour: "101145",
    askp1: "223500", askp_rsqn1: "20134", askp2: "224000", askp_rsqn2: "31000",
    bidp1: "223000", bidp_rsqn1: "53870", bidp2: "0", bidp_rsqn2: "0",
    total_askp_rsqn: "703049", total_bidp_rsqn: "457349",
  };

  it("1단계부터 · 가격 0 인 단계는 뺀다 · 접수 시각은 오늘 KST", async () => {
    const b = await withBody({ output1 }, "2026-10-27T01:12:00Z").orderbook("005930");
    assert.deepEqual(b.asks.map((l) => [l.price, l.quantity]), [[223_500, 20_134n], [224_000, 31_000n]]);
    assert.deepEqual(b.bids.map((l) => [l.price, l.quantity]), [[223_000, 53_870n]]);
    assert.equal(b.totalAskQuantity, 703_049n);
    assert.equal(b.at!.toISOString(), "2026-10-27T01:11:45.000Z");
  });

  it("자정 넘어 본 장 마감 호가는 어제 날짜다", async () => {
    const b = await withBody({ output1: { ...output1, aspr_acpt_hour: "153000" } }, "2026-10-27T16:30:00Z").orderbook("005930"); // 10-28 01:30 KST
    assert.equal(b.at!.toISOString(), "2026-10-27T06:30:00.000Z");
  });
});

describe("시간외 단일가 응답 해석 (FR-27 · 슬라이스 6b)", () => {
  const withBody = (output: Record<string, string>) => {
    const c = new KisClient({ appKey: "k", appSecret: "s", baseUrl: "http://127.0.0.1:9" });
    (c as unknown as { get: () => Promise<unknown> }).get = async () => ({ output });
    return c;
  };

  it("가격 0 은 그날 체결 없음 — null(10-27 10:12 장중 실측 응답)", async () => {
    assert.equal(await withBody({ ovtm_untp_prpr: "0", ovtm_untp_prdy_vrss: "0", ovtm_untp_prdy_vrss_sign: "0", ovtm_untp_prdy_ctrt: "0.00", ovtm_untp_vol: "0" }).afterHoursQuote("005930"), null);
  });

  it("하락 부호면 값 칸에 부호가 있든 없든 음수", async () => {
    for (const v of ["1500", "-1500"]) {
      const q = await withBody({ ovtm_untp_prpr: "222000", ovtm_untp_prdy_vrss: v, ovtm_untp_prdy_vrss_sign: "5", ovtm_untp_prdy_ctrt: v.replace("1500", "0.67"), ovtm_untp_vol: "1234" }).afterHoursQuote("005930");
      assert.deepEqual(q, { code: "005930", price: 222_000, change: -1500, changeRate: -0.67, volume: 1234n });
    }
  });
});

describe("한도 나눠 쓰기 순서 (FR-91 · 슬라이스 6b)", () => {
  // 어떤 호출이 어느 줄에 서는지만 본다 — 줄의 순서 자체는 pacer.test.ts
  const priorities = async (call: (c: KisClient) => Promise<unknown>) => {
    const c = new KisClient({ appKey: "k", appSecret: "s", baseUrl: "http://127.0.0.1:9" });
    let seen: number | undefined;
    (c as unknown as { get: (...args: unknown[]) => Promise<unknown> }).get = async (...args: unknown[]) => {
      seen = args[3] as number;
      return { output: { stck_prpr: "1", bstp_nmix_prpr: "1" }, output2: [] };
    };
    await call(c).catch(() => undefined);
    return seen;
  };

  it("현재가 · 달력 < 일봉 · 분봉 < 지수 · 투자자", async () => {
    assert.equal(await priorities((c) => c.quote("005930")), KIS_PRIORITY.poll);
    assert.equal(await priorities((c) => c.marketDays("2026-10-27")), KIS_PRIORITY.poll);
    assert.equal(await priorities((c) => c.dailyCandles("005930", "2026-10-01", "2026-10-27")), KIS_PRIORITY.candles);
    assert.equal(await priorities((c) => c.intradayMinuteCandles("005930", "153000")), KIS_PRIORITY.candles);
    assert.equal(await priorities((c) => c.dayMinuteCandles("005930", "2026-10-27", "153000")), KIS_PRIORITY.candles);
    assert.equal(await priorities((c) => c.indexQuote("0001")), KIS_PRIORITY.supplement);
    assert.equal(await priorities((c) => c.investorFlows("005930")), KIS_PRIORITY.supplement);
    // 호가는 화면이 기다린다 — 폴링 줄(동시 6건 뒤)
    assert.equal(await priorities((c) => c.orderbook("005930")), KIS_PRIORITY.poll);
    assert.equal(await priorities((c) => c.afterHoursQuote("005930")), KIS_PRIORITY.supplement);
    assert.ok(KIS_PRIORITY.realtime < KIS_PRIORITY.poll && KIS_PRIORITY.poll < KIS_PRIORITY.candles && KIS_PRIORITY.candles < KIS_PRIORITY.supplement);
  });
});

describe("시장 상태 응답 해석 (F016 단계 A · SRV-REQ-051 FR-2 · 6)", () => {
  it("현재가 상태 칸 — 2026-11-06 삼성전자 실측 응답(평소 값 N)과 플래그 Y", async () => {
    const c = new KisClient({ appKey: "k", appSecret: "s", baseUrl: "http://127.0.0.1:9" });
    const body = (over: Record<string, string>) => ({
      output: {
        stck_prpr: "187300", iscd_stat_cls_code: "55", temp_stop_yn: "N", vi_cls_code: "N", ovtm_vi_cls_code: "N",
        invt_caful_yn: "N", mrkt_warn_cls_code: "00", short_over_yn: "N", sltr_yn: "N", mang_issu_cls_code: "N", ...over,
      },
    });
    (c as unknown as { get: () => Promise<unknown> }).get = async () => body({});
    const plain = await c.quote("005930");
    assert.deepEqual(
      [plain.viCode, plain.cautionFlag, plain.managedFlag, plain.liquidationFlag, plain.shortOverheatFlag],
      ["N", false, false, false, false]
    );
    (c as unknown as { get: () => Promise<unknown> }).get = async () =>
      body({ vi_cls_code: "Y", invt_caful_yn: "Y", mang_issu_cls_code: "Y", sltr_yn: "Y", short_over_yn: "Y" });
    const flagged = await c.quote("005930");
    assert.deepEqual(
      [flagged.viCode, flagged.cautionFlag, flagged.managedFlag, flagged.liquidationFlag, flagged.shortOverheatFlag],
      ["Y", true, true, true, true]
    );
  });

  // 2026-11-06 10:35 장중 실측 응답(앞 두 행) + 해제된 행 하나 · 시각 없는 행 하나
  const VI_ROWS = [
    { mksc_shrn_iscd: "Q580047", vi_cls_code: "Y", bsop_date: "20261106", cntg_vi_hour: "103436", vi_cncl_hour: "000000", vi_kind_code: "2", vi_prc: "8995", vi_stnd_prc: "0", vi_dprt: "0.00", vi_dmc_stnd_prc: "8455", vi_dmc_dprt: "6.39", vi_count: "3" },
    { mksc_shrn_iscd: "043610", vi_cls_code: "Y", bsop_date: "20261106", cntg_vi_hour: "103426", vi_cncl_hour: "000000", vi_kind_code: "2", vi_prc: "3800", vi_stnd_prc: "0", vi_dprt: "0.00", vi_dmc_stnd_prc: "4055", vi_dmc_dprt: "-6.29", vi_count: "2" },
    { mksc_shrn_iscd: "005930", vi_cls_code: "N", bsop_date: "20261106", cntg_vi_hour: "090112", vi_cncl_hour: "090334", vi_kind_code: "1", vi_prc: "182000", vi_stnd_prc: "201500", vi_dprt: "-9.68", vi_dmc_stnd_prc: "0", vi_dmc_dprt: "0.00", vi_count: "1" },
    { mksc_shrn_iscd: "000660", bsop_date: "20261106", cntg_vi_hour: "", vi_kind_code: "1" },
  ];
  const withPage = (trCont: string) => {
    const c = new KisClient({ appKey: "k", appSecret: "s", baseUrl: "http://127.0.0.1:9" });
    const calls: unknown[][] = [];
    (c as unknown as { request: (...a: unknown[]) => Promise<unknown> }).request = async (...a: unknown[]) => {
      calls.push(a);
      return { body: { output: VI_ROWS }, trCont };
    };
    return { c, calls };
  };

  it("VI 한 쪽 — 시각은 그날 KST → UTC · 해제 전(000000)은 null · 0 괴리율은 null · 시각 없는 행은 버린다", async () => {
    const { c, calls } = withPage("F");
    const page = await c.viEventsPage("2026-11-06", false);
    assert.equal(page.hasMore, true);
    assert.equal(page.events.length, 3);
    const [etn, dyn, stat] = page.events;
    assert.equal(etn!.code, "Q580047");
    assert.equal(dyn!.triggeredAt.toISOString(), "2026-11-06T01:34:26.000Z");
    assert.equal(dyn!.releasedAt, null);
    assert.deepEqual([dyn!.kind, dyn!.triggerPrice, dyn!.staticGapRate, dyn!.dynamicGapRate, dyn!.count], ["dynamic", 3800, null, -6.29, 2]);
    assert.equal(stat!.releasedAt?.toISOString(), "2026-11-06T00:03:34.000Z");
    assert.deepEqual([stat!.kind, stat!.staticGapRate, stat!.dynamicGapRate], ["static", -9.68, null]);
    // 첫 쪽은 이어 받기 표시 없음 · 날짜는 YYYYMMDD · 한도 맨 뒤 줄 · 허용 목록 TR
    assert.equal(calls[0]![1], KIS_QUERY_TR.viStatus);
    assert.equal((calls[0]![2] as Record<string, string>).FID_INPUT_DATE_1, "20261106");
    assert.equal(calls[0]![3], KIS_PRIORITY.supplement);
    assert.equal(calls[0]![4], "");
  });

  it("다음 쪽은 tr_cont N 으로 잇고 · 응답 머리가 D · E · 빈 값이면 끝", async () => {
    const { c, calls } = withPage("D");
    assert.equal((await c.viEventsPage("2026-11-06", true)).hasMore, false);
    assert.equal(calls[0]![4], "N");
    for (const end of ["E", ""]) assert.equal((await withPage(end).c.viEventsPage("2026-11-06", true)).hasMore, false);
    assert.equal((await withPage("M").c.viEventsPage("2026-11-06", true)).hasMore, true);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  annualizedVolatility,
  buildPositionFlow,
  buildRiskRadar,
  kstDate,
  maxDrawdown,
  newsNegativeShare,
  periodReturn,
  type DailyClose,
  type RiskRadarPolicy,
  type TimelineTrade,
} from "../index";

/** KST 날짜 d 의 코인 일봉(00:00 UTC = 09:00 KST 시작) */
const coin = (symbol: string, day: string, close: number): DailyClose => ({
  symbol,
  assetType: "crypto",
  close,
  timestamp: new Date(`${day}T00:00:00Z`),
});
/** KST 날짜 d 의 국내 일봉(전날 15:00 UTC = d 00:00 KST) */
const kr = (code: string, day: string, close: number): DailyClose => ({
  symbol: code,
  assetType: "kr_stock",
  close,
  timestamp: new Date(new Date(`${day}T00:00:00Z`).getTime() - 9 * 3600_000),
});
const trade = (symbol: string, at: string, type: "buy" | "sell", quantity: number, assetType: TimelineTrade["assetType"] = "crypto"): TimelineTrade => ({
  symbol,
  assetType,
  transactionType: type,
  quantity,
  transactionDate: new Date(at),
});

describe("kstDate — 일봉 시각(UTC 저장)을 KST 날짜로", () => {
  it("코인 00:00 UTC 는 같은 날, 국내 15:00 UTC 는 다음 날", () => {
    assert.equal(kstDate(new Date("2026-11-18T00:00:00Z")), "2026-11-18");
    assert.equal(kstDate(new Date("2026-11-17T15:00:00Z")), "2026-11-18");
    assert.equal(kstDate(new Date("2026-11-17T14:59:59Z")), "2026-11-17");
  });
});

describe("buildPositionFlow — 그날 실제 수량 × 그날 종가", () => {
  it("산 날부터 점이 생기고, 그 전 날은 점이 없다(0 으로 그리지 않는다)", () => {
    const flow = buildPositionFlow(
      [trade("BTC", "2026-11-02T01:00:00Z", "buy", 2)],
      [coin("BTC", "2026-11-01", 100), coin("BTC", "2026-11-02", 110), coin("BTC", "2026-11-03", 121)],
      "2026-11-01",
      "2026-11-03",
    );
    assert.deepEqual(flow.points.map((p) => [p.date, p.valueKrw]), [["2026-11-02", 220], ["2026-11-03", 242]]);
  });

  it("판 날 평가금은 줄지만 지수(수익률)는 가격만큼만 움직인다 — 판 것이 낙폭이 되지 않는다", () => {
    const flow = buildPositionFlow(
      [trade("BTC", "2026-11-01T00:00:00Z", "buy", 10), trade("BTC", "2026-11-02T03:00:00Z", "sell", 9)],
      [coin("BTC", "2026-11-01", 100), coin("BTC", "2026-11-02", 100), coin("BTC", "2026-11-03", 100)],
      "2026-11-01",
      "2026-11-03",
    );
    assert.deepEqual(flow.points.map((p) => p.valueKrw), [1000, 100, 100]);
    assert.deepEqual(flow.points.map((p) => p.index), [1, 1, 1]);
    assert.deepEqual(maxDrawdown(flow.points), { pct: 0, peakDate: "2026-11-01", troughDate: "2026-11-01" });
  });

  it("산 날 들어온 돈도 수익률이 아니다 — 하루 수익률은 전날 수량으로만 잰다", () => {
    const flow = buildPositionFlow(
      [trade("BTC", "2026-11-01T00:00:00Z", "buy", 1), trade("BTC", "2026-11-02T00:00:00Z", "buy", 9)],
      [coin("BTC", "2026-11-01", 100), coin("BTC", "2026-11-02", 110)],
      "2026-11-01",
      "2026-11-02",
    );
    assert.deepEqual(flow.points.map((p) => p.valueKrw), [100, 1100]);
    assert.equal(periodReturn(flow.points)?.toFixed(6), "10.000000");
  });

  it("국내 휴장일은 앞날 종가를 이어 쓴다 — 주말마다 국내 칸이 0 이 되지 않는다", () => {
    const flow = buildPositionFlow(
      [trade("005930", "2026-11-06T00:00:00Z", "buy", 10, "kr_stock"), trade("BTC", "2026-11-06T00:00:00Z", "buy", 1)],
      [kr("005930", "2026-11-06", 50), coin("BTC", "2026-11-06", 100), coin("BTC", "2026-11-07", 100)],
      "2026-11-06",
      "2026-11-07",
    );
    assert.deepEqual(flow.points.map((p) => p.valueKrw), [600, 600]);
    assert.deepEqual(flow.missingSymbols, []);
  });

  it("종가가 아직 없던 보유는 평가금에서 빠지고 이름이 드러난다", () => {
    const flow = buildPositionFlow(
      [trade("NEW", "2026-11-01T00:00:00Z", "buy", 1), trade("BTC", "2026-11-01T00:00:00Z", "buy", 1)],
      [coin("BTC", "2026-11-01", 100)],
      "2026-11-01",
      "2026-11-01",
    );
    assert.equal(flow.points[0].valueKrw, 100);
    assert.deepEqual(flow.missingSymbols, ["NEW"]);
  });

  it("구간 앞의 움직임은 지수에 섞이지 않는다 — 구간 첫 점 = 1", () => {
    const flow = buildPositionFlow(
      [trade("BTC", "2026-10-01T00:00:00Z", "buy", 1)],
      [coin("BTC", "2026-10-31", 50), coin("BTC", "2026-11-01", 100), coin("BTC", "2026-11-02", 90)],
      "2026-11-01",
      "2026-11-02",
    );
    assert.equal(flow.points[0].index, 1);
    assert.equal(periodReturn(flow.points)?.toFixed(6), "-10.000000");
  });

  it("거래 순서가 뒤섞여 들어와도 같은 답", () => {
    const trades = [trade("BTC", "2026-11-02T00:00:00Z", "sell", 1), trade("BTC", "2026-11-01T00:00:00Z", "buy", 2)];
    const closes = [coin("BTC", "2026-11-01", 100), coin("BTC", "2026-11-02", 100)];
    assert.deepEqual(buildPositionFlow(trades, closes, "2026-11-01", "2026-11-02"), buildPositionFlow([...trades].reverse(), closes, "2026-11-01", "2026-11-02"));
  });
});

describe("maxDrawdown · periodReturn · annualizedVolatility", () => {
  const pts = (...index: number[]) => index.map((i, n) => ({ date: `2026-11-${String(n + 1).padStart(2, "0")}`, index: i }));

  it("최고점 뒤 가장 깊은 곳 — 나중 고점 전의 저점이 아니라", () => {
    assert.deepEqual(maxDrawdown(pts(1, 1.2, 0.9, 1.5, 1.2)), { pct: -25, peakDate: "2026-11-02", troughDate: "2026-11-03" });
  });

  it("점 하나 이하면 null — 0 이 아니다", () => {
    assert.equal(maxDrawdown(pts(1)), null);
    assert.equal(periodReturn(pts(1)), null);
  });

  it("변동성은 하루 수익률이 문턱 개수 미만이면 null, 같은 값이면 0", () => {
    assert.equal(annualizedVolatility(pts(1, 1.1, 1.2), 3), null);
    assert.equal(annualizedVolatility(pts(1, 1, 1, 1), 3), 0);
    const v = annualizedVolatility(pts(1, 1.01, 1, 1.01, 1), 3)!;
    assert.ok(v > 15 && v < 25, `연율 ${v}`);
  });
});

describe("buildRiskRadar — 4축 · 상한은 설정", () => {
  const policy: RiskRadarPolicy = {
    concentrationLimit: 60,
    volatilityFullScalePct: 80,
    volatilityLimit: 60,
    drawdownFullScalePct: 50,
    drawdownLimit: 60,
    newsLimit: 40,
    newsMinArticles: 3,
    newsMinCoveragePct: 50,
  };

  it("상한과 같으면 넘음, 바로 아래면 아님(경계)", () => {
    const axes = buildRiskRadar({ topWeight: { symbol: "BTC", pct: 60 }, volatilityPct: 47.99, drawdownPct: -30, news: [] }, policy);
    const byKey = Object.fromEntries(axes.map((a) => [a.key, a]));
    assert.equal(byKey.concentration.breached, true);
    assert.equal(byKey.concentration.reasonCode, "over_limit");
    assert.equal(byKey.concentration.subject, "BTC");
    assert.equal(byKey.volatility.breached, false);
    assert.equal(byKey.drawdown.value, 60);
    assert.equal(byKey.drawdown.breached, true);
    assert.equal(byKey.drawdown.raw, -30);
  });

  it("재료가 없는 축은 value null + insufficient_data — 0 점이 아니다", () => {
    const axes = buildRiskRadar({ topWeight: null, volatilityPct: null, drawdownPct: null, news: [] }, policy);
    for (const a of axes) {
      assert.equal(a.value, null);
      assert.equal(a.reasonCode, "insufficient_data");
      assert.equal(a.breached, false);
    }
  });

  it("점수는 0~100 으로 자른다 — 변동성 200% 도 100", () => {
    const axes = buildRiskRadar({ topWeight: null, volatilityPct: 200, drawdownPct: -80, news: [] }, policy);
    assert.equal(axes[1].value, 100);
    assert.equal(axes[2].value, 100);
  });

  it("뉴스 축 — 기사 문턱을 채운 보유만 가중, 그 비중이 문턱 미만이면 null", () => {
    assert.equal(newsNegativeShare([{ weightPct: 60, labeled: 10, negative: 5 }, { weightPct: 40, labeled: 0, negative: 0 }], policy), 50);
    assert.equal(newsNegativeShare([{ weightPct: 49, labeled: 10, negative: 5 }, { weightPct: 51, labeled: 2, negative: 2 }], policy), null);
    assert.equal(
      newsNegativeShare([{ weightPct: 50, labeled: 4, negative: 4 }, { weightPct: 50, labeled: 10, negative: 0 }], policy),
      50,
    );
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  matchConditions,
  tradeCheckSummary,
  triggerSet,
  type BaseRateRow,
  type BaseRateTriggerRow,
} from "../policy/tradeCheck";

/**
 * 점검 — 조건 문턱 비교 · 쉬운 한 줄(F017 v2 단계 2 · `SRV-REQ-053` FR-4).
 * 문턱 정의는 예측 한 곳(`base-rate@1`) — 여기는 숫자 비교와 문장 규칙만 본다.
 */

const NOW = new Date("2026-11-11T03:00:00Z"); // 12:00 KST — 장중
const KR_YESTERDAY = new Date("2026-11-10T07:00:00Z"); // 어제 16:00 KST 봉
const KR_TODAY = new Date("2026-11-11T07:00:00Z");

const trig = (p: Partial<BaseRateTriggerRow>): BaseRateTriggerRow => ({
  conditionId: "K1",
  appliesTo: "next",
  refClose: 10_000,
  refAt: KR_YESTERDAY,
  priceAtLeast: null,
  priceAtMost: null,
  openAtLeast: null,
  valueAtLeast: null,
  ...p,
});

const row = (p: Partial<BaseRateRow>): BaseRateRow => ({
  market: "kr",
  conditionId: "K1",
  horizon: 1,
  asOf: NOW,
  kind: "test",
  status: "ok",
  sample: 26_228,
  sampleEff: 492,
  sampleDays: 987,
  upRate: 0.467,
  upLow: 0.424,
  upHigh: 0.512,
  mean: -0.001,
  q10: -0.054,
  q50: -0.002,
  q90: 0.059,
  holdUpRate: 0.51,
  holdQ10: -0.05,
  holdQ50: 0.001,
  holdQ90: 0.063,
  differs: "higher",
  recentDiffers: false,
  ...p,
});

const quote = { price: 9_000, open: 9_900, tradeValue: 5e9, updatedAt: NOW };

describe("matchConditions — 문턱 경계 표", () => {
  const cases: Array<[string, BaseRateTriggerRow, number | null, boolean]> = [
    ["이하 문턱 — 같음은 성립", trig({ priceAtMost: 9_000 }), 9_000, true],
    ["이하 문턱 — 1원 위는 아님", trig({ priceAtMost: 9_000 }), 9_001, false],
    ["이상 문턱 — 같음은 성립", trig({ conditionId: "K4", priceAtLeast: 12_900 }), 12_900, true],
    ["이상 문턱 — 아래는 아님", trig({ conditionId: "K4", priceAtLeast: 12_900 }), 12_899, false],
    ["가격 모름 — 성립으로 치지 않는다", trig({ priceAtMost: 9_000 }), null, false],
  ];
  for (const [name, t, price, expected] of cases) {
    it(name, () => {
      const m = matchConditions("kr", [t], { ...quote, price }, NOW);
      assert.equal(m.matched.includes(t.conditionId), expected);
    });
  }

  it("시가 · 거래대금 조건은 모르면 성립 아님(K2 · K3)", () => {
    const k2 = trig({ conditionId: "K2", priceAtLeast: 8_000, valueAtLeast: 1e9 });
    const k3 = trig({ conditionId: "K3", openAtLeast: 10_300 });
    assert.deepEqual(matchConditions("kr", [k2, k3], { price: 9_000, open: null, tradeValue: null, updatedAt: NOW }, NOW).matched, []);
    assert.deepEqual(
      matchConditions("kr", [k2, k3], { price: 9_000, open: 10_300, tradeValue: 1e9, updatedAt: NOW }, NOW).matched,
      ["K2", "K3"]
    );
  });

  it("여럿이면 우선순위 — 상한가 근처(K4) > 거래 몰림(K2) > 급락(K1)", () => {
    const m = matchConditions(
      "kr",
      [trig({ conditionId: "K1", priceAtMost: 99_999 }), trig({ conditionId: "K4", priceAtLeast: 1 })],
      quote,
      NOW
    );
    assert.deepEqual(m.matched, ["K4", "K1"]);
  });

  it("시세가 기준 봉보다 뒤일 때만 다음 장 문턱 — 아니면 마지막 종가에 성립한 조건(경계 표)", () => {
    const at = (ms: number) => new Date(KR_YESTERDAY.getTime() + ms);
    assert.equal(triggerSet(KR_YESTERDAY, at(1)), "next");
    assert.equal(triggerSet(KR_YESTERDAY, at(0)), "closed"); // 같은 시각 — 그 뒤 체결 없음
    assert.equal(triggerSet(KR_YESTERDAY, at(-1)), "closed");
    assert.equal(triggerSet(KR_YESTERDAY, null), "closed");
  });

  it("장 마감 뒤 저녁 — 오늘 급락은 closed 의 K1, 내일 문턱은 안 본다", () => {
    const evening = new Date("2026-11-11T10:00:00Z"); // 19:00 KST
    const m = matchConditions(
      "kr",
      [
        trig({ conditionId: "K1", appliesTo: "closed", refAt: KR_TODAY }),
        trig({ conditionId: "K4", appliesTo: "next", refAt: KR_TODAY, priceAtLeast: 1 }),
      ],
      { ...quote, updatedAt: new Date("2026-11-11T06:30:00Z") }, // 15:30 KST 마지막 체결
      evening
    );
    assert.deepEqual(m.matched, ["K1"]);
  });

  it("2026-11-11 결함 — 갱신이 멈춘 시세는 다음 장 문턱과 비교하지 않는다", () => {
    const k4 = trig({ conditionId: "K4", priceAtLeast: 437_310, refClose: 339_000 });
    const staleQuote = { price: 665_000, open: null, tradeValue: null, updatedAt: new Date("2026-10-07T07:31:08Z") };
    assert.deepEqual(matchConditions("kr", [k4], staleQuote, NOW).matched, []);
  });

  it("기준 종가가 묵으면 판정하지 않는다 — 국내 4일 · 코인 2일", () => {
    const old = trig({ priceAtMost: 99_999, refAt: new Date("2026-11-06T07:00:00Z") });
    const m = matchConditions("kr", [old], quote, NOW);
    assert.deepEqual(m.matched, []);
    assert.equal(m.reason, "stale_reference");
    assert.equal(matchConditions("kr", [], quote, NOW).reason, "not_covered");
  });
});

describe("tradeCheckSummary — 문장 규칙", () => {
  const FORBIDDEN = /(사세요|파세요|매수하|매도하|반드시|확실|무조건|오를 것|내릴 것|목표가)/;

  it("사기 전 — 조건 · 기간 · 숫자가 한 문장, 평소와 다름은 Holm 통과 때만", () => {
    const s = tradeCheckSummary({ market: "kr", side: "buy", condition: row({}), usual: row({ conditionId: "ALL", upRate: 0.396, kind: "usual", differs: null }) });
    assert.match(s, /평소보다 크게 내린 날/);
    assert.match(s, /다음 거래일 종가까지 수수료 · 세금을 빼고도/);
    assert.match(s, /100번 중 47번/);
    assert.match(s, /평소\(40번\)보다 많아요/);
    assert.doesNotMatch(s, FORBIDDEN);
    const plain = tradeCheckSummary({ market: "kr", side: "buy", condition: row({ differs: null }), usual: row({ conditionId: "ALL" }) });
    assert.doesNotMatch(plain, /평소\(/);
  });

  it("below_min — 비율 없이 이유 문장", () => {
    const s = tradeCheckSummary({ market: "crypto", side: "buy", condition: row({ conditionId: "C2", status: "below_min", upRate: null, sampleEff: 37.4 }), usual: null });
    assert.match(s, /아직 37번뿐/);
    assert.doesNotMatch(s, /%|100번 중/);
  });

  it("팔기 전 — 보유 연장 비율, 평소와 다름 · 매입가 · 손익 없음", () => {
    const s = tradeCheckSummary({ market: "crypto", side: "sell", condition: row({ conditionId: "C3L" }), usual: row({ conditionId: "ALL" }) });
    assert.match(s, /더 들고 있었을 때 하루 동안/);
    assert.match(s, /100번 중 51번/);
    assert.doesNotMatch(s, /평소\(|매입|손익|원/);
    assert.doesNotMatch(s, FORBIDDEN);
  });

  it("조건 없음 — 평소 값으로 말하고 지어내지 않는다", () => {
    const s = tradeCheckSummary({ market: "kr", side: "buy", condition: null, usual: row({ conditionId: "ALL", upRate: 0.396 }) });
    assert.match(s, /따로 볼 만한 상황이 아니에요/);
    assert.match(s, /100번 중 40번/);
    assert.equal(tradeCheckSummary({ market: "kr", side: "buy", condition: null, usual: null }), "지금은 과거와 견줄 기록이 없어요.");
  });
});

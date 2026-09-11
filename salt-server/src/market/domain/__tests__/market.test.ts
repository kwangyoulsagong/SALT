import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calculateIndicators,
  calculateSentimentScore,
  calculateSmartMoneyIndex,
  interpretSentiment,
  interpretSmartMoney,
  movingAverage,
  relativeStrengthIndex,
  SentimentLabel,
  volatilityOf,
} from "../index";

/**
 * 이관 전 동작을 고정하는 **특성화 테스트**다 (NFR 정정 — DB 가 비어 있어 스냅샷이
 * 성립하지 않는다). 값이 "맞는지"를 주장하지 않는다. 값이 **달라지면 보이게** 하는 것이
 * 목적이고, 달라지는 것 자체가 판단해야 할 사실이다.
 */

describe("심리 점수", () => {
  it("중립 입력이 중립 구간에 들어간다", () => {
    const score = calculateSentimentScore({
      priceChange: 0,
      volatility: 4,
      volume: 100,
      avgVolume: 100,
    });

    // 가격 50×0.4 + 변동성 80×0.3 + 거래량 50×0.3 = 59
    assert.equal(score.total, 59);
    assert.equal(score.label, SentimentLabel.Neutral);
  });

  it("Fear&Greed 가 있으면 총점의 30% 를 차지한다", () => {
    const base = { priceChange: 0, volatility: 4, volume: 100, avgVolume: 100 };

    const without = calculateSentimentScore(base);
    const with0 = calculateSentimentScore({ ...base, fearGreed: 10 });

    assert.equal(with0.total, Math.round(59 * 0.7 + 10 * 0.3));
    assert.notEqual(without.total, with0.total);
  });

  /**
   * **`fearGreed: 0` 은 혼합되지 않는다.** 원문이 `if (params.fearGreed)` 로 검사해
   * 0 이 falsy 로 걸러진다. 극단적 공포(지수 0)가 총점을 낮추지 못한다는 뜻이고,
   * 이것은 버그로 보이지만 **이관에서 고치지 않았다** — 고치면 점수가 달라진다.
   */
  it("fearGreed 0 은 falsy 라 무시된다 (원문 동작)", () => {
    const base = { priceChange: 0, volatility: 4, volume: 100, avgVolume: 100 };

    assert.equal(
      calculateSentimentScore({ ...base, fearGreed: 0 }).total,
      calculateSentimentScore(base).total
    );
  });

  it("변동성 점수는 20~80 으로 눌린다", () => {
    const extreme = calculateSentimentScore({
      priceChange: 0,
      volatility: 999,
      volume: 100,
      avgVolume: 100,
    });
    const none = calculateSentimentScore({
      priceChange: 0,
      volatility: 0,
      volume: 100,
      avgVolume: 100,
    });

    assert.equal(extreme.components.volatility, 20);
    assert.equal(none.components.volatility, 80);
  });

  it("라벨 경계는 20·40·60·80 이고 해석이 라벨을 따른다", () => {
    assert.equal(interpretSentiment(20).title, "극단적 공포");
    assert.equal(interpretSentiment(21).title, "공포");
    assert.equal(interpretSentiment(60).title, "중립");
    assert.equal(interpretSentiment(61).title, "탐욕");
    assert.equal(interpretSentiment(81).title, "극단적 탐욕");
  });

  it("확신 표현과 수익률 예측을 담지 않는다", () => {
    const forbidden = ["확실", "무조건", "보장", "100%"];

    for (const score of [0, 25, 50, 75, 100]) {
      const text = Object.values(interpretSentiment(score)).join(" ");
      for (const word of forbidden) {
        assert.ok(!text.includes(word), `"${word}" 가 ${score} 해석에 있다`);
      }
    }
  });

  it("변동성은 고가·저가 폭을 현재가로 나눈 백분율이다", () => {
    assert.equal(volatilityOf(110, 90, 100), 20);
  });
});

describe("스마트 머니 지수", () => {
  it("대량 매수 1건은 10점이고 호가가 균형이면 그대로다", () => {
    const index = calculateSmartMoneyIndex({
      largeBuys: 1,
      largeSells: 0,
      bidPressure: 100,
      askPressure: 100,
    });

    assert.deepEqual(index, { score: 10, signal: "중립" });
  });

  it("-100~100 으로 잘린다", () => {
    const index = calculateSmartMoneyIndex({
      largeBuys: 0,
      largeSells: 50,
      bidPressure: 1,
      askPressure: 1000,
    });

    assert.equal(index.score, -100);
    assert.equal(index.signal, "강한 매도");
  });

  it("해석 경계가 지수 경계와 같다", () => {
    assert.equal(interpretSmartMoney(60).title, "고래들이 사고 있어요!");
    assert.equal(interpretSmartMoney(59).title, "매수세 우세");
    assert.equal(interpretSmartMoney(-20).title, "중립");
    assert.equal(interpretSmartMoney(-21).title, "매도세 우세");
    assert.equal(interpretSmartMoney(-61).title, "고래들이 팔고 있어요!");
  });
});

describe("기술 지표", () => {
  it("이동평균 분모는 period 다 — 입력이 짧으면 값이 작아진다 (원문 동작)", () => {
    // 값 3개를 20으로 나눈다. 평균이 아니라 원문의 산술이다.
    assert.equal(movingAverage([10, 20, 30], 20), 3);
    assert.equal(movingAverage([1, 2, 3, 4], 4), 2.5);
  });

  /**
   * **하락이 없으면 RSI 가 100 이 아니다.** 원문이 `gains / (losses || 1)` 로 나누기
   * 때문에 상승 폭이 곧 RS 가 된다. 계단식 상승(+1 씩)에서는 RSI 가 93 정도로 나온다.
   */
  it("하락이 없을 때 RSI 는 100 이 아니고 상승 폭에 따라 달라진다", () => {
    const steady = Array.from({ length: 15 }, (_, i) => 100 + i);
    const steep = Array.from({ length: 15 }, (_, i) => 100 + i * 100);

    const rsiSteady = relativeStrengthIndex(steady, 14);
    const rsiSteep = relativeStrengthIndex(steep, 14);

    assert.ok(rsiSteady < 100, `RSI 가 100 이 됐다: ${rsiSteady}`);
    assert.equal(Math.round(rsiSteady), 93);
    assert.ok(rsiSteep > rsiSteady, "상승 폭이 클수록 RSI 가 커진다");
  });

  it("상승·하락이 같으면 RSI 는 50 이다", () => {
    const zigzag = Array.from({ length: 15 }, (_, i) => (i % 2 === 0 ? 100 : 110));
    assert.equal(relativeStrengthIndex(zigzag, 14), 50);
  });

  it("지표 한 벌은 종가·거래량에서 넷을 만든다", () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + i);
    const volumes = Array.from({ length: 60 }, () => 1000);

    const set = calculateIndicators(closes, volumes);

    assert.equal(set.volumeAvg20, 1000);
    assert.equal(set.ma20, movingAverage(closes, 20));
    assert.equal(set.ma50, movingAverage(closes, 50));
    assert.ok(set.ma20 > set.ma50, "상승 구간에서 단기 이평이 위에 있다");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CoachExplanationInput } from "../../domain";
import { buildExplanationPrompt, explanationCacheKey } from "../explanationPrompt";

const base: CoachExplanationInput = {
  symbol: "BTC",
  koreanName: "비트코인",
  mode: "scalp",
  currentPrice: 100_000_000,
  change24h: 1.2,
  tradeValue24h: 5e11,
  evidence: [{ label: "근거", value: "RSI 45" }],
  news: [{ title: "제목", summary: "요약", source: "출처", sentiment: "중립" }],
};

const key = (input: CoachExplanationInput, model = "m") =>
  explanationCacheKey(model, buildExplanationPrompt(input));

/** C02 — 모델이 본 것이 하나라도 다르면 다른 캐시다 */
describe("explanationCacheKey", () => {
  it("같은 입력이면 같은 키", () => {
    assert.equal(key(base), key({ ...base }));
  });

  it("가격이 다르면 다른 키 — 옛 키는 200 이상이면 전부 같았다", () => {
    const keys = [200, 1_000, 100_000_000, 200_000_000].map((currentPrice) =>
      key({ ...base, currentPrice })
    );
    assert.equal(new Set(keys).size, 4);
  });

  it("근거 · 뉴스 요약 · 기간 · 모델이 달라도 다른 키", () => {
    const k = key(base);
    assert.notEqual(k, key({ ...base, evidence: [{ label: "근거", value: "RSI 71" }] }));
    assert.notEqual(k, key({ ...base, news: [{ ...base.news![0]!, summary: "다른 요약" }] }));
    assert.notEqual(k, key({ ...base, news: [{ ...base.news![0]!, source: "다른 출처" }] }));
    assert.notEqual(k, key({ ...base, mode: "long_term" }));
    assert.notEqual(k, key(base, "other-model"));
  });
});

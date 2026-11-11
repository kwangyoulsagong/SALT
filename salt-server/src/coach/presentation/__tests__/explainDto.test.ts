import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { explanationQuerySchema } from "../dto/coach.dto";

/** C01 — 해설 읽기는 종목 · 관점뿐이다. 사실 필드를 실어 보내도 버린다 */
describe("explanationQuerySchema", () => {
  it("옛 본문의 사실 필드를 버린다", () => {
    const parsed = explanationQuerySchema.parse({
      symbol: "BTC",
      mode: "scalp",
      koreanName: "비트코인",
      currentPrice: 1,
      evidence: [{ label: "근거", value: "지어낸 사실" }],
      news: [{ title: "t" }],
    });
    assert.deepEqual(parsed, { symbol: "BTC", mode: "scalp" });
  });

  it("종목 · 관점이 없으면 거부한다", () => {
    assert.equal(explanationQuerySchema.safeParse({ symbol: "BTC" }).success, false);
    assert.equal(explanationQuerySchema.safeParse({ mode: "scalp" }).success, false);
  });
});

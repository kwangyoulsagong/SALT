import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { krListQuerySchema } from "../dto/krStock.dto";

describe("krListQuerySchema — codes(F011 슬라이스 3b)", () => {
  it("쉼표 구분 · 공백 · 중복을 정리하고 형식이 아니면 거부한다", () => {
    assert.deepEqual(krListQuerySchema.parse({ codes: "005930, 000660,005930" }).codes, ["005930", "000660"]);
    assert.equal(krListQuerySchema.parse({}).codes, undefined);
    assert.throws(() => krListQuerySchema.parse({ codes: "BTC" }));
  });
});

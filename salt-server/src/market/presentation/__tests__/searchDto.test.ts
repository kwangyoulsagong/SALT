import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { risingSectorsSchema, searchGroupsSchema, searchRelatedSchema } from "../dto/search.dto";

/** 검색 모달 2단계 입력(`SRV-REQ-055`) — 허용 · 거절 경계 */
describe("검색 모달 2단계 DTO", () => {
  it("곁 칸 — 종목(assetType + symbol) 또는 업종 하나만, 코인 심볼은 대문자로", () => {
    assert.deepEqual(searchRelatedSchema.parse({ assetType: "crypto", symbol: "btc" }), { assetType: "crypto", symbol: "BTC" });
    assert.deepEqual(searchRelatedSchema.parse({ assetType: "kr_stock", symbol: "005930" }), {
      assetType: "kr_stock",
      symbol: "005930",
    });
    assert.deepEqual(searchRelatedSchema.parse({ sector: "0013" }), { sector: "0013" });
    const rejected = [
      {},
      { assetType: "crypto" },
      { symbol: "BTC" },
      { sector: "0013", assetType: "crypto", symbol: "BTC" },
      { assetType: "kr_stock", symbol: "abc" },
      { assetType: "stock", symbol: "AAPL" },
      { sector: "13" },
      { assetType: "crypto", symbol: "BTC;DROP" },
    ];
    for (const bad of rejected) assert.throws(() => searchRelatedSchema.parse(bad), JSON.stringify(bad));
  });

  it("묶음 — 빈 검색어 허용 · 31자 거절", () => {
    assert.deepEqual(searchGroupsSchema.parse({}), { q: "" });
    assert.throws(() => searchGroupsSchema.parse({ q: "가".repeat(31) }));
  });

  it("뜨는 업종 — 기본 5 · 1~20", () => {
    assert.deepEqual(risingSectorsSchema.parse({}), { limit: 5 });
    assert.deepEqual(risingSectorsSchema.parse({ limit: "20" }), { limit: 20 });
    assert.throws(() => risingSectorsSchema.parse({ limit: "0" }));
    assert.throws(() => risingSectorsSchema.parse({ limit: "21" }));
  });
});

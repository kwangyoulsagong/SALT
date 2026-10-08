import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { KrStockStore } from "../../domain";
import { ResolveKrStockUniverse } from "../SyncKrStock";

describe("ResolveKrStockUniverse", () => {
  it("보유 → 관심 → 시총 순서로 겹침 없이 모은다(FR-11 · 12, F011 슬라이스 3b)", async () => {
    const store = {
      watchedCodes: async () => ["000660", "035420"],
      topByMarketCap: async (n: number) => {
        assert.equal(n, 3);
        return ["005930", "000660", "373220"];
      },
    } as unknown as KrStockStore;
    const held = { heldCodes: async () => ["091990", "005930"] };

    const codes = await new ResolveKrStockUniverse(store, held, 3).execute();

    assert.deepEqual(codes, ["091990", "005930", "000660", "035420", "373220"]);
  });
});

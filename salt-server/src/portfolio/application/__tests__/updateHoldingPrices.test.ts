import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { HoldingRepository } from "../../domain";
import { UpdateHoldingPrices } from "../ReadPortfolio";

describe("UpdateHoldingPrices", () => {
  /**
   * 시세를 밀어 넣는 쪽(BFF 워커)은 구독 중인 **전체 심볼**을 5초마다 보낸다. 보유는
   * 보통 몇 건이다 — 원문은 심볼마다 조회를 돌아서 아무것도 안 바뀌는 조회를 5초마다
   * 100번 했다. 조회는 한 번이어야 한다.
   */
  it("심볼 수와 무관하게 조회를 한 번만 한다", async () => {
    let findCalls = 0;
    const applied: Array<{ id: string; currentValue: number }> = [];

    const holdings = {
      findBySymbols: async (symbols: string[]) => {
        findCalls += 1;
        assert.equal(symbols.length, 100);
        return [
          { id: "h1", symbol: "BTC", totalQuantity: 2, totalInvested: 100 },
        ];
      },
      applyValuation: async (
        id: string,
        valuation: { currentValue: number }
      ) => {
        applied.push({ id, currentValue: valuation.currentValue });
      },
    } as unknown as HoldingRepository;

    await new UpdateHoldingPrices(holdings).execute(
      Array.from({ length: 100 }, (_, index) => ({
        symbol: index === 0 ? "BTC" : `SYM${index}`,
        currentPrice: index === 0 ? 150 : 1,
      }))
    );

    assert.equal(findCalls, 1);
    assert.deepEqual(applied, [{ id: "h1", currentValue: 300 }]);
  });

  it("보낼 시세가 없으면 조회하지 않는다", async () => {
    let findCalls = 0;
    const holdings = {
      findBySymbols: async () => {
        findCalls += 1;
        return [];
      },
      applyValuation: async () => {},
    } as unknown as HoldingRepository;

    await new UpdateHoldingPrices(holdings).execute([]);

    assert.equal(findCalls, 0);
  });

  /** 보낸 심볼 중 보유가 없는 것은 조회 결과에 없으므로 자연히 건너뛴다. */
  it("보유가 없는 심볼은 갱신하지 않는다", async () => {
    const applied: string[] = [];
    const holdings = {
      findBySymbols: async () => [],
      applyValuation: async (id: string) => {
        applied.push(id);
      },
    } as unknown as HoldingRepository;

    await new UpdateHoldingPrices(holdings).execute([
      { symbol: "DOGE", currentPrice: 500 },
    ]);

    assert.deepEqual(applied, []);
  });
});

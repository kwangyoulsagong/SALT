import type { TradePreflightRequest } from "@repo/core/coach";

/**
 * 주문 전 체크 계산 키. `["coach", …]` 아래라 코치 전체 무효화(거래 저장 등)에 같이 걸린다 —
 * 보유가 바뀌면 진입 후 비중이 바뀐다.
 */
export const preflightKeys = {
  all: () => ["coach", "preflight"] as const,
  check: (input: TradePreflightRequest) =>
    [
      ...preflightKeys.all(),
      input.symbol,
      input.mode,
      input.entryPrice,
      input.amount,
      input.stopLossRate ?? null,
      input.takeProfitPrices.join(","),
    ] as const,
};

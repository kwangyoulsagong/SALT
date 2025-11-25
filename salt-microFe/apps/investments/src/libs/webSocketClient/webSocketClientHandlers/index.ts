import {
  WSClientContext,
  WSClientReceiveMessage,
} from "../type/webSokcetClient.type";
import { handleCandle } from "./candle";
import { handlePriceUpdate } from "./priceUpdate";

export function dispatchMessage(
  ctx: WSClientContext,
  msg: WSClientReceiveMessage
): void {
  switch (msg.type) {
    case "price_update":
      handlePriceUpdate(ctx, msg);
      break;
    case "candle":
      handleCandle(ctx, msg);
      break;
    default:
      // TypeScript의 exhaustive check
      const _exhaustiveCheck: never = msg;
      console.warn("없는 타입:", _exhaustiveCheck);
  }
}

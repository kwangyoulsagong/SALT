import {
  WSClientContext,
  WSClientReceiveMessage,
  WSMessageType,
} from "../types";
import { handleCandle } from "./candle";
import { handlePriceUpdate } from "./priceUpdate";

export function dispatchMessage(
  ctx: WSClientContext,
  msg: WSClientReceiveMessage,
): void {
  switch (msg.type) {
    case WSMessageType.PriceUpdate:
      handlePriceUpdate(ctx, msg);
      break;
    case WSMessageType.Candle:
      handleCandle(ctx, msg);
      break;
    case WSMessageType.Subscribed:
    case WSMessageType.Unsubscribed:
    case WSMessageType.Connected:
    case WSMessageType.SubscribedCandle:
    case WSMessageType.UnsubscribedCandle:
    case WSMessageType.Pong:
    case WSMessageType.Error:
      return;
    default: {
      // TypeScript의 exhaustive check
      const _exhaustiveCheck: never = msg;
      console.warn("없는 타입:", _exhaustiveCheck);
    }
  }
}

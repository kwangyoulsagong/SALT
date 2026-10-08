import {
  WSClientContext,
  WSClientReceiveMessage,
  WSAssetType,
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
      return;
    case WSMessageType.Error:
      // 국내 주식 구독 거부만 화면에 알린다 — 코인 오류는 지금처럼 버린다
      if (msg.assetType === WSAssetType.KrStock) ctx.notifyKrError(msg.code ?? "UNKNOWN");
      return;
    default: {
      // TypeScript의 exhaustive check
      const _exhaustiveCheck: never = msg;
      console.warn("없는 타입:", _exhaustiveCheck);
    }
  }
}

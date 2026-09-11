import {
  WSClientContext,
  WSClientReceiveMessage,
  WSMessageType,
} from "../types";

export const handlePriceUpdate = (
  ctx: WSClientContext,
  msg: Extract<WSClientReceiveMessage, { type: WSMessageType.PriceUpdate }>,
) => {
  const listeners = ctx.priceListeners.get(msg.data.symbol);
  listeners?.forEach((fn) => fn(msg.data));
};

import {
  WSClientContext,
  WSClientReceiveMessage,
} from "../type/webSokcetClient.type";

export const handlePriceUpdate = (
  ctx: WSClientContext,
  msg: Extract<WSClientReceiveMessage, { type: "price_update" }>
) => {
  const listeners = ctx.priceListeners.get(msg.data.symbol);
  listeners?.forEach((fn) => fn(msg.data));
};

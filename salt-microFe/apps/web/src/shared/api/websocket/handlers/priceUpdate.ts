import {
  WSClientContext,
  WSClientReceiveMessage,
  WSMessageType,
} from "../types";

export const handlePriceUpdate = (
  ctx: WSClientContext,
  msg: Extract<WSClientReceiveMessage, { type: WSMessageType.PriceUpdate }>,
) => {
  // 국내 주식 체결은 맵이 다르다 — 코인 리스너에 6자리 코드가 섞이지 않게
  const map = msg.data.assetType === "kr_stock" ? ctx.krPriceListeners : ctx.priceListeners;
  const listeners = map.get(msg.data.symbol);
  listeners?.forEach((fn) => fn(msg.data));
};

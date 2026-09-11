import {
  WSClientContext,
  WSClientReceiveMessage,
  WSMessageType,
} from "../types";

export const handleCandle = (
  ctx: WSClientContext,
  msg: Extract<WSClientReceiveMessage, { type: WSMessageType.Candle }>,
) => {
  const tfMap = ctx.candleListeners.get(msg.symbol);
  const listeners = tfMap?.get(msg.timeframe);
  listeners?.forEach((fn) =>
    fn({ symbol: msg.symbol, timeframe: msg.timeframe, candle: msg.data }),
  );
};

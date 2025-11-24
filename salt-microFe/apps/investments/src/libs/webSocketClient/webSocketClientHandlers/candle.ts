import {
  WSClientContext,
  WSClientReceiveMessage,
} from "../type/webSokcetClient.type";

export const handleCandle = (
  ctx: WSClientContext,
  msg: Extract<WSClientReceiveMessage, { type: "candle" }>
) => {
  const tfMap = ctx.candleListners.get(msg.symbol);
  const listeners = tfMap?.get(msg.timeframe);
  listeners?.forEach((fn) =>
    fn({ symbol: msg.symbol, timeframe: msg.timeframe, candle: msg.data })
  );
};

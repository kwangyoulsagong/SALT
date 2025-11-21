import { useEffect, useState } from "react";
import { wsClient } from "@/libs/webSocketClient";

interface MarketItem {
  symbol: string;
  koreanName: string;
}

interface PriceState {
  [symbol: string]: number;
}

interface BlinkState {
  [symbol: string]: "up" | "down" | null;
}

export default function MarketList() {
  const [market, setMarket] = useState<MarketItem[]>([]);
  const [prices, setPrices] = useState<PriceState>({});
  const [blink, setBlink] = useState<BlinkState>({});

  /** 📌 1) REST: 시장 목록 (최초 1번) */
  useEffect(() => {
    fetch("http://localhost:4001/api/investment/market/overview")
      .then((res) => res.json())
      .then((res) => {
        if (res.items) setMarket(res.items);
      });
  }, []);

  /** 📌 2) WebSocket: listener만 등록 (배치는 wsClient가 알아서 처리) */
  useEffect(() => {
    if (market.length === 0) return;

    const symbols = market.map((m) => m.symbol.toUpperCase());

    // 🟢 한 번에 구독 (최초 1번만)
    wsClient.subscribePriceBatch(symbols);

    // 🔔 Listener만 등록
    const listener = (data: any) => {
      setPrices((prev) => {
        const prevPrice = prev[data.symbol];
        const newPrice = data.currentPrice;

        if (prevPrice !== undefined && prevPrice !== newPrice) {
          setBlink((b) => ({
            ...b,
            [data.symbol]: newPrice > prevPrice ? "up" : "down",
          }));
          setTimeout(() => {
            setBlink((b) => ({ ...b, [data.symbol]: null }));
          }, 300);
        }
        return { ...prev, [data.symbol]: newPrice };
      });
    };

    // 🟣 리스너만 추가
    symbols.forEach((symbol) => wsClient.addPriceListener(symbol, listener));

    // 🧹 cleanup (여기 ★)
    return () => {
      // 🟣 리스너 제거
      symbols.forEach((symbol) =>
        wsClient.removePriceListener(symbol, listener)
      );

      // 🔴 서버 구독도 batch로 해제!!!
      wsClient.unsubscribePriceBatch(symbols);
    };
  }, [market]);

  return (
    <div style={{ padding: 20, fontFamily: "monospace" }}>
      <h2>📈 Live Market (REST + WebSocket)</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {market.map((m) => {
          const price = prices[m.symbol];
          const style =
            blink[m.symbol] === "up"
              ? { color: "red", fontWeight: "bold" }
              : blink[m.symbol] === "down"
              ? { color: "blue", fontWeight: "bold" }
              : {};

          return (
            <li key={m.symbol} style={{ padding: "4px 0" }}>
              {m.koreanName} ({m.symbol}) 👉{" "}
              <span style={{ transition: "0.2s ease", ...style }}>
                {price ? price.toLocaleString() : "Loading..."}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

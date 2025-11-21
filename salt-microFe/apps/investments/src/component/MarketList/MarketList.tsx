"use client";
import { useEffect, useState } from "react";
import { wsClient } from "@/libs/webSocketClient";
import dynamic from "next/dynamic";

// ⭐ 차트는 SSR 안되므로 dynamic import
const MarketChart = dynamic(
  () => import("@/component/MarketChart/MarketChart"),
  { ssr: false }
);

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
  const [selected, setSelected] = useState("BTC"); // ⭐ 선택된 심볼 상태

  /** 📌 1) REST: 시장 목록 */
  useEffect(() => {
    fetch(
      "http://localhost:4001/api/investment/market/overview?page=1&limit=100"
    )
      .then((res) => res.json())
      .then((res) => {
        if (!res.items) return;

        const items = res.items;
        setMarket(items);

        // 초기 가격 채우기
        const initialPrices = Object.fromEntries(
          items.map((m: any) => [m.symbol, m.currentPrice])
        );
        setPrices(initialPrices);

        // ⭐ 처음 항목을 차트 기본값으로 설정
        setSelected(items[0]?.symbol);
      });
  }, []);

  /** 📌 2) WebSocket 구독 */
  useEffect(() => {
    if (market.length === 0) return;
    const symbols = market.map((m) => m.symbol.toUpperCase());

    wsClient.subscribePriceBatch(symbols);

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

    symbols.forEach((symbol) => wsClient.addPriceListener(symbol, listener));

    return () => {
      symbols.forEach((symbol) =>
        wsClient.removePriceListener(symbol, listener)
      );
      wsClient.unsubscribePriceBatch(symbols);
    };
  }, [market]);

  /** 🖱️ 클릭하여 차트 변경 */
  const handleSelect = (symbol: string) => {
    setSelected(symbol);
  };

  return (
    <div
      style={{ display: "flex", gap: 20, fontFamily: "monospace", padding: 20 }}
    >
      {/* 📋 왼쪽 코인 리스트 */}
      <div style={{ width: "30%" }}>
        <h2>📈 Live Market</h2>
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
              <li
                key={m.symbol}
                style={{
                  padding: "4px 0",
                  cursor: "pointer",
                  background: selected === m.symbol ? "#333" : "transparent",
                }}
                onClick={() => handleSelect(m.symbol)}
              >
                {m.koreanName} ({m.symbol}) 👉{" "}
                <span style={{ transition: "0.2s ease", ...style }}>
                  {price ? price.toLocaleString() : "Loading..."}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* 📊 오른쪽 차트 */}
      <div style={{ flexGrow: 1 }}>
        {selected && <MarketChart symbol={selected} timeframe="1m" />}
      </div>
    </div>
  );
}

"use client";

import { useRef } from "react";

import { useLivePrice } from "@repo/web-shared/api";

import { useLiveTabIdentity } from "../lib/useLiveTabIdentity";
import { formatPrice } from "@repo/web-shared/lib";

import { change as changeStyle, price as priceStyle, priceRow, tick } from "./SymbolHeader.css";

const MINUS = "−";

const formatChange = (percent: number) => {
  const fixed = Math.abs(percent).toFixed(2);
  if (Number(fixed) === 0) return { text: "0.00%", tone: "flat" as const };
  return percent > 0
    ? { text: `+${fixed}%`, tone: "up" as const }
    : { text: `${MINUS}${fixed}%`, tone: "down" as const };
};

interface LivePriceRowProps {
  symbol: string;
  /** 탭 제목 · 파비콘(`FE-REQ-049` FR-12) — 종목 이름 · 로고 */
  name: string;
  logoUrl: string | null;
  /** 서버가 받은 가격 · 변동률 — 첫 HTML(SEO)에 들어가고, WS 값이 오면 바뀐다. 없으면 `null` */
  initialPrice: number | null;
  initialChange24h: number | null;
}

/**
 * 머리 가격 줄 — **클라이언트 잎.** 서버가 준 값으로 먼저 그리고(수화 일치), WS 시세가 오면 옮겨 쓴다.
 *
 * 값이 바뀔 때마다 가격 아래 밑줄이 오른 쪽 색(빨강/파랑)으로 한 번 스친다 — `key` 재마운트,
 * `opacity` 만 움직인다. 머리 나머지(이름 · 지표)는 서버 컴포넌트로 남는다(`SymbolHeader`).
 */
export const LivePriceRow = ({ symbol, name, logoUrl, initialPrice, initialChange24h }: LivePriceRowProps) => {
  const live = useLivePrice(symbol);
  const price = live?.currentPrice ?? initialPrice;
  const change24h = live?.change24h ?? initialChange24h;
  // 상세에 있는 동안 브라우저 탭 = 이 종목(실시간 가격 · 로고 파비콘) — 같은 실시간 값을 쓴다
  useLiveTabIdentity({ name, price, changeRate: change24h, logoUrl });

  const previous = useRef(price);
  const direction =
    price !== null && previous.current !== null && price !== previous.current
      ? price > previous.current
        ? "up"
        : "down"
      : null;
  previous.current = price;

  const change = change24h === null ? null : formatChange(change24h);

  return (
    <div className={priceRow}>
      {price !== null && (
        <span className={priceStyle}>
          {formatPrice(price)}
          {direction && <span key={`${price}`} className={tick[direction]} aria-hidden="true" />}
        </span>
      )}
      {change && <span className={changeStyle[change.tone]}>{change.text}</span>}
    </div>
  );
};

export default LivePriceRow;

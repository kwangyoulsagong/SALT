"use client";

import type { KrOrderbookLevel, KrSessionView } from "@repo/core/marketKr";
import { kstClock } from "@repo/core/marketKr";
import { StatusLine } from "@repo/ui/statusLine";

import { KR_STOCK_MESSAGES, useKrOrderbook } from "@/entities/market";
import { formatPrice } from "@/shared/lib";

import {
  bar,
  caption,
  currentRow,
  heading,
  headingRow,
  priceCell,
  priceTone,
  qtyCell,
  qtyText,
  staleMark,
  table,
  th,
  totalCell,
  totalRow,
} from "./KrOrderbook.css";
import { krSideCard } from "./SymbolHeader.css";

const M = KR_STOCK_MESSAGES.orderbook;

/** 호가가 다시 받아지는 장 — 장전 동시호가부터 장 마감 동시호가까지. 그 밖엔 호가가 바뀌지 않는다 */
const LIVE_SESSIONS: ReadonlySet<KrSessionView["session"]> = new Set(["pre_open", "regular", "closing_auction"]);

const shares = (quantity: string) => BigInt(quantity).toLocaleString("ko-KR");
// 앱 대상이 ES2020 아래라 BigInt 리터럴(0n)을 못 쓴다
const ZERO = BigInt(0);
const HUNDRED = BigInt(100);

interface LevelRowProps {
  side: "ask" | "bid";
  level: number;
  row: KrOrderbookLevel;
  /** 막대 길이 기준(가장 큰 잔량) — 표시 비율만, 금액이 아니다 */
  maxQuantity: bigint;
  basePrice: number | null;
  currentPrice: number;
}

const LevelRow = ({ side, level, row, maxQuantity, basePrice, currentPrice }: LevelRowProps) => {
  const q = BigInt(row.quantity);
  // 막대 폭(%) — BigInt 나눗셈이라 소수 없이 정수 %. 0 이 아닌 잔량은 최소 1% 로 보인다
  const width = maxQuantity === ZERO ? 0 : Math.max(q > ZERO ? 1 : 0, Number((q * HUNDRED) / maxQuantity));
  const tone = basePrice === null || row.price === basePrice ? "flat" : row.price > basePrice ? "up" : "down";
  const qty = (
    <td className={qtyCell[side]}>
      <span className={bar[side]} style={{ width: `${width}%` }} aria-hidden />
      <span className={qtyText}>{shares(row.quantity)}</span>
    </td>
  );
  return (
    <tr
      className={row.price === currentPrice ? currentRow : undefined}
      aria-label={M.rowLabel(side, level, formatPrice(row.price), shares(row.quantity))}
    >
      {side === "ask" ? qty : <td className={qtyCell.empty} />}
      <th scope="row" className={`${priceCell[side]} ${priceTone[tone]}`}>
        {formatPrice(row.price)}
      </th>
      {side === "bid" ? qty : <td className={qtyCell.empty} />}
    </tr>
  );
};

interface KrOrderbookProps {
  code: string;
  session: KrSessionView;
  /** 색 기준(전일 종가) · 현재가 행 표시 — 둘 다 서버 값 */
  basePrice: number | null;
  currentPrice: number;
}

/**
 * 국내 주식 호가 10단계(F011 슬라이스 6b · `FE-REQ-041` FR-33) — 매도 잔량 | 호가 | 매수 잔량 사다리.
 *
 * - 사실만 보인다: 잔량 · 총잔량. "매수세가 강하다" 같은 해석 문구 · 잔량 비율 숫자는 두지 않는다(마스터 인덱스 §6-4)
 * - 서버가 요청 시점에 받고 10초 캐시한다 — 장이 열린 동안만 10초마다 다시 받는다
 * - 404 · 로그인 안 함 · 불러오는 중 · 꺼짐이면 자리도 없다(투자자 표와 같은 규칙). 못 받았으면 한 줄
 */
export const KrOrderbook = ({ code, session, basePrice, currentPrice }: KrOrderbookProps) => {
  const { data, isError } = useKrOrderbook(code, LIVE_SESSIONS.has(session.session));
  if (!data || isError || data.status === "disabled") return null;

  if (data.status !== "ok" || !data.available) {
    return (
      <section className={krSideCard} aria-labelledby="kr-orderbook-heading">
        <h2 id="kr-orderbook-heading" className={heading}>
          {M.heading}
        </h2>
        <StatusLine kind="error">{M.unavailable}</StatusLine>
      </section>
    );
  }

  const { asks, bids } = data;
  const maxQuantity = [...asks, ...bids].reduce((max, l) => (BigInt(l.quantity) > max ? BigInt(l.quantity) : max), ZERO);
  return (
    <section className={krSideCard} aria-labelledby="kr-orderbook-heading">
      <div className={headingRow}>
        <h2 id="kr-orderbook-heading" className={heading}>
          {M.heading}
        </h2>
        {data.at && (
          <p className={caption}>
            {M.asOf(kstClock(data.at))}
            {data.stale && (
              <span className={staleMark} title={M.staleTitle}>
                {M.stale}
              </span>
            )}
          </p>
        )}
      </div>
      {asks.length === 0 && bids.length === 0 ? (
        <StatusLine kind="empty">{M.empty}</StatusLine>
      ) : (
        <table className={table}>
          <thead>
            <tr>
              <th className={th} scope="col">
                {M.columns.ask}
              </th>
              <th className={th} scope="col">
                {M.columns.price}
              </th>
              <th className={th} scope="col">
                {M.columns.bid}
              </th>
            </tr>
          </thead>
          <tbody>
            {/* 매도는 비싼 단계가 위 — 1단계(최우선 매도)가 가운데로 온다 */}
            {asks
              .map((row, i) => ({ row, level: i + 1 }))
              .reverse()
              .map(({ row, level }) => (
                <LevelRow key={`a${level}`} side="ask" level={level} row={row} maxQuantity={maxQuantity} basePrice={basePrice} currentPrice={currentPrice} />
              ))}
            {bids.map((row, i) => (
              <LevelRow key={`b${i + 1}`} side="bid" level={i + 1} row={row} maxQuantity={maxQuantity} basePrice={basePrice} currentPrice={currentPrice} />
            ))}
          </tbody>
          <tfoot>
            <tr className={totalRow}>
              <td className={totalCell.ask}>{data.totalAskQuantity === null ? "" : shares(data.totalAskQuantity)}</td>
              <th scope="row" className={totalCell.label}>
                {M.total}
              </th>
              <td className={totalCell.bid}>{data.totalBidQuantity === null ? "" : shares(data.totalBidQuantity)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </section>
  );
};

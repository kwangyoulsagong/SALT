"use client";

import { AssetIcon } from "@repo/ui/assetIcon";

import { MOBILE_ROUTES } from "@repo/core/mobile";
import { useLivePrice } from "@repo/web-shared/api";
import { formatPrice } from "@repo/web-shared/lib";
import { MobileHead } from "@repo/web-shared/layout/mobile";

import { useKrDetail, useMarketListing } from "@/entities/market";

import { INVESTMENT_DETAIL_MOBILE as M } from "../model/messages";
import * as s from "./detailMobile.css";

const MINUS = "−";

/** 등락은 색 + 부호를 같이(색만으로 전하지 않는다) — 값은 서버 · 시세 그대로 */
const Change = ({ percent }: { percent: number }) => {
  const fixed = Math.abs(percent).toFixed(2);
  const tone = Number(fixed) === 0 ? s.flat : percent > 0 ? s.up : s.down;
  const text = Number(fixed) === 0 ? "0.00%" : percent > 0 ? `+${fixed}%` : `${MINUS}${fixed}%`;
  return <span className={`${s.change} ${tone}`}>{text}</span>;
};

const back = { href: MOBILE_ROUTES.investments, label: M.backTo };

/** 코인 — 이름은 시세 목록 한 줄, 가격은 WS 가 오면 옮겨 쓴다(가격 깜빡임 없음 — `motion.md` §5) */
const CryptoHead = ({ symbol }: { symbol: string }) => {
  const listing = useMarketListing(symbol);
  const live = useLivePrice(symbol);
  const item = listing.item;
  const price = live?.currentPrice ?? item?.currentPrice ?? null;
  const change = live?.change24h ?? item?.change24h ?? null;
  return (
    <>
      <MobileHead title={item?.koreanName ?? symbol} back={back} />
      <div className={s.priceRow}>
        <AssetIcon symbol={symbol} src={item?.logoUrl ?? undefined} name={item?.koreanName ?? symbol} size="sm" />
        <span className={s.price}>{price === null ? "—" : `${formatPrice(price)}원`}</span>
        {change === null ? null : <Change percent={change} />}
      </div>
    </>
  );
};

/** 국내 — 상세 응답의 시세 한 벌(장중 갱신은 그 쿼리가 한다) */
const KrHead = ({ code }: { code: string }) => {
  const detail = useKrDetail(code);
  const quote = detail.data?.status === "ok" ? detail.data.quote : null;
  return (
    <>
      <MobileHead title={quote?.name ?? code} back={back} />
      <div className={s.priceRow}>
        <AssetIcon symbol={code} name={quote?.name ?? code} size="sm" />
        <span className={s.price}>{quote ? `${formatPrice(quote.price)}원` : "—"}</span>
        {quote ? <Change percent={quote.changeRate} /> : null}
      </div>
    </>
  );
};

/** 머리 — 뒤로 + 이름 / 아이콘 · 가격 · 등락. 이름 · 가격은 데스크톱 상세와 같은 조회 */
export const DetailMobileHead = ({ symbol, asset }: { symbol: string; asset: "crypto" | "kr" }) =>
  asset === "kr" ? <KrHead code={symbol} /> : <CryptoHead symbol={symbol} />;

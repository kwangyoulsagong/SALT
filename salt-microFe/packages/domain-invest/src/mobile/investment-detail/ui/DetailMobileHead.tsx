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
const Change = ({ percent, label }: { percent: number; label: string }) => {
  const fixed = Math.abs(percent).toFixed(2);
  const tone = Number(fixed) === 0 ? s.flat : percent > 0 ? s.up : s.down;
  const text = Number(fixed) === 0 ? "0.00%" : percent > 0 ? `+${fixed}%` : `${MINUS}${fixed}%`;
  return (
    <p className={s.changeLine}>
      <span className={s.changeLabel}>{label}</span>
      <span className={`${s.change} ${tone}`}>{text}</span>
    </p>
  );
};

/**
 * 머리(`FE-REQ-074` FR-6 · 기준 화면 분석 §1) — 뒤로 + 이름 22 · 아이콘 / 가격 30(화면 주인공 하나) / 등락 줄 15(이름 + 색 + 부호).
 * 이름 · 가격은 데스크톱 상세와 같은 조회
 */
const Head = ({ symbol, name, logoUrl, price, change, changeLabel }: { symbol: string; name: string; logoUrl?: string; price: string; change: number | null; changeLabel: string }) => (
  <>
    <MobileHead title={name} back={back} trailing={<AssetIcon symbol={symbol} src={logoUrl} name={name} size="md" />} />
    <div className={s.priceBlock}>
      <span className={s.price}>{price}</span>
      {change === null ? null : <Change percent={change} label={changeLabel} />}
    </div>
  </>
);

const back = { href: MOBILE_ROUTES.investments, label: M.backTo };

/** 코인 — 이름은 시세 목록 한 줄, 가격은 WS 가 오면 옮겨 쓴다(가격 깜빡임 없음 — `motion.md` §5) */
const CryptoHead = ({ symbol }: { symbol: string }) => {
  const listing = useMarketListing(symbol);
  const live = useLivePrice(symbol);
  const item = listing.item;
  const price = live?.currentPrice ?? item?.currentPrice ?? null;
  const change = live?.change24h ?? item?.change24h ?? null;
  return (
    <Head
      symbol={symbol}
      name={item?.koreanName ?? symbol}
      logoUrl={item?.logoUrl ?? undefined}
      price={price === null ? "—" : `${formatPrice(price)}원`}
      change={change}
      changeLabel={M.change}
    />
  );
};

/** 국내 — 상세 응답의 시세 한 벌(장중 갱신은 그 쿼리가 한다) */
const KrHead = ({ code }: { code: string }) => {
  const detail = useKrDetail(code);
  const quote = detail.data?.status === "ok" ? detail.data.quote : null;
  return (
    <Head
      symbol={code}
      name={quote?.name ?? code}
      price={quote ? `${formatPrice(quote.price)}원` : "—"}
      change={quote ? quote.changeRate : null}
      changeLabel={M.change}
    />
  );
};

/** 머리 — 자산군에 따라 조회만 다르다 */
export const DetailMobileHead = ({ symbol, asset }: { symbol: string; asset: "crypto" | "kr" }) =>
  asset === "kr" ? <KrHead code={symbol} /> : <CryptoHead symbol={symbol} />;

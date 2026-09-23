"use client";

import { AssetIcon } from "@repo/ui/assetIcon";

import { useMarketListing } from "@/entities/market";

import { identity, identityName, identitySymbol, identityText } from "./CoachReport.css";

interface AssetIdentityProps {
  symbol: string;
  /** `md` = 종목 줄(32px 로고) · `sm` = 문장 옆 작은 표시(24px) */
  size: "sm" | "md";
}

/**
 * 종목 자리 — **로고 + 한글 이름 + 심볼**. 종목이 나오는 자리에는 로고가 늘 있다.
 *
 * 로고 주소 · 한글 이름은 서버가 시세 목록에 싣는다(`logoUrl` — 주식은 로고 규칙이 달라
 * 프론트가 주소를 만들지 않는다). 목록에서 못 찾으면 `AssetIcon` 이 심볼 이니셜로 그린다 —
 * 로고 자리가 비지 않는다.
 */
export const AssetIdentity = ({ symbol, size }: AssetIdentityProps) => {
  const { item } = useMarketListing(symbol);
  const name = item?.koreanName ?? symbol;

  return (
    <span className={identity[size]}>
      <AssetIcon symbol={symbol} src={item?.logoUrl ?? undefined} name={name} size={size} />
      <span className={identityText}>
        <span className={identityName[size]}>{name}</span>
        {size === "md" && item?.koreanName && (
          <span className={identitySymbol}>{symbol.toUpperCase()}</span>
        )}
      </span>
    </span>
  );
};

export default AssetIdentity;

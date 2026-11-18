"use client";

import { AssetIcon } from "@repo/ui/assetIcon";
import { SearchField } from "@repo/ui/searchField";
import { StatusLine } from "@repo/ui/statusLine";
import { useState } from "react";

import { MarketAssetClass, useAssetSearch } from "@/entities/market";
import type { LedgerAssetType } from "@/entities/portfolio";
import { useDebouncedValue } from "@repo/web-shared/lib";

import { LEDGER_PREVIEW_DEBOUNCE_MS, LEDGER_SHEET_MESSAGES as M } from "../model";
import { note, resultButton, resultCode, resultList } from "./LedgerSheet.css";

export interface PickedSymbol {
  symbol: string;
  name: string;
  logoUrl: string | null;
}

/** 한 번에 보이는 결과 수 — 시트 안 목록이라 짧게(서버 상한 20 안) */
const RESULT_LIMIT = 8;

const CLASS_OF: Record<LedgerAssetType, MarketAssetClass> = {
  crypto: MarketAssetClass.Crypto,
  kr_stock: MarketAssetClass.KrStock,
};

/**
 * 시트 안 종목 찾기(`FE-REQ-030` FR-104) — 기존 종목 검색 조회(`useAssetSearch`)를 자산군으로 걸러 쓴다. 빈 검색어면 서버가 추적 목록
 * (관심 ∪ 보유)을 준다 — 판 종목을 적을 때 바로 고를 수 있다. 검색 모달(`search-asset`)과 달리 주소 · 최근 검색을 건드리지 않는다
 */
export const LedgerSymbolPicker = ({
  assetType,
  onPick,
}: {
  assetType: LedgerAssetType;
  onPick: (picked: PickedSymbol) => void;
}) => {
  const [text, setText] = useState("");
  const query = useDebouncedValue(text.trim(), LEDGER_PREVIEW_DEBOUNCE_MS);
  const search = useAssetSearch(query, CLASS_OF[assetType]);
  const items = (search.data?.items ?? []).filter((item) => item.assetType === assetType).slice(0, RESULT_LIMIT);

  return (
    <>
      <SearchField
        value={text}
        onChange={setText}
        onClear={() => setText("")}
        label={M.symbolSearchLabel}
        placeholder={M.symbolSearchPlaceholder}
        autoComplete="off"
      />
      {search.isError ? (
        <StatusLine kind="error">{M.symbolSearchFailed}</StatusLine>
      ) : search.isPending ? (
        <p className={note}>{M.symbolSearching}</p>
      ) : items.length === 0 ? (
        <p className={note}>{query === "" ? M.symbolHint : M.symbolNone}</p>
      ) : (
        <ul className={resultList} aria-label={M.symbolLabel}>
          {items.map((item) => (
            <li key={item.symbol}>
              <button
                type="button"
                className={resultButton}
                onClick={() => onPick({ symbol: item.symbol, name: item.name, logoUrl: item.logoUrl })}
              >
                {/* 국내 주식 코드는 숫자라 이니셜이 "00" — 이름으로 */}
                <AssetIcon symbol={assetType === "kr_stock" ? item.name : item.symbol} src={item.logoUrl ?? undefined} name={item.name} size="sm" />
                <span>{item.name}</span>
                <span className={resultCode}>{item.symbol}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
};

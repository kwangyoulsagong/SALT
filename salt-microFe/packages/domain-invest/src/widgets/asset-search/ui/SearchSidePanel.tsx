"use client";

import { AssetIcon } from "@repo/ui/assetIcon";
import { Skeleton } from "@repo/ui/skeleton";
import Link from "next/link";
import type { MouseEvent } from "react";

import {
  MarketAssetClass,
  SEARCH_EXTRA_MESSAGES as M,
  SEARCH_MESSAGES,
  type SearchRelatedTarget,
  useSearchRelated,
} from "@/entities/market";
import { ROUTES } from "@repo/web-shared/config";

import * as styles from "./SearchSidePanel.css";

const changeKind = (value: number) => (value > 0 ? "up" : value < 0 ? "down" : "flat");

/**
 * 곁 칸(`FE-REQ-066` FR-8) — 고른 줄의 관련 종목. 국내 종목 = 같은 업종 · 업종 = 구성 종목 · 코인 = 같은 기사에 함께 태그(서버 `basis`).
 * 링크는 보통 링크(Tab 으로 닿는다) — 검색칸의 ↑↓ 는 왼쪽 목록만 옮긴다. 768 밑에서는 숨는다(한 열)
 */
export const SearchSidePanel = ({
  target,
  isSector,
  hasSelection,
  onNavigate,
}: {
  target: SearchRelatedTarget | null;
  /** 고른 줄이 업종이면 머리를 "구성 종목"으로 */
  isSector: boolean;
  /** 줄을 골랐나 — 골랐는데 대상이 없으면(뉴스 · 지수 줄) 안내 없이 빈 칸 */
  hasSelection: boolean;
  onNavigate: (href: string) => void;
}) => {
  const { data, isFetching, isPending } = useSearchRelated(target);

  const onClick = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    onNavigate(href);
  };

  let content;
  if (target === null) {
    content = hasSelection ? null : <p className={styles.hint}>{M.sideEmpty}</p>;
  } else if (isPending && isFetching) {
    content = (
      <div role="status" aria-busy="true" aria-label={M.sideLoading}>
        <Skeleton lines={3} height={40} radius="base" />
      </div>
    );
  } else if (!data || data.basis === "none") {
    content = <p className={styles.hint}>{M.sideNone}</p>;
  } else {
    const heading =
      data.basis === "co_tagged"
        ? M.sideCoTagged
        : data.sector
          ? isSector
            ? M.sideSectorMembers(data.sector.name)
            : M.sideSectorPeers(data.sector.name)
          : M.sideCoTagged;
    content = (
      <>
        <h3 className={styles.heading}>
          <span>{heading}</span>
          {data.sector ? (
            <span className={styles.change[changeKind(data.sector.changeRate)]}>
              {SEARCH_MESSAGES.changeRate(data.sector.changeRate)}
            </span>
          ) : null}
        </h3>
        <ul className={styles.list}>
          {data.items.map((item) => {
            const href = ROUTES.investmentDetail(item.symbol);
            return (
              <li key={`${item.assetType}:${item.symbol}`}>
                <Link href={href} prefetch={false} className={styles.row} onClick={onClick(href)}>
                  <AssetIcon
                    // 국내 코드는 이니셜이 "00" 이 된다 — 이름으로
                    symbol={item.assetType === MarketAssetClass.KrStock ? item.name : item.symbol}
                    src={item.logoUrl ?? undefined}
                    name={item.name}
                    size="sm"
                  />
                  <span className={styles.name}>{item.name}</span>
                  {item.changeRate === null ? (
                    <span className={styles.change.flat}>{SEARCH_MESSAGES.valueUnknown}</span>
                  ) : (
                    <span className={styles.change[changeKind(item.changeRate)]}>{SEARCH_MESSAGES.changeRate(item.changeRate)}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </>
    );
  }

  return (
    <aside className={styles.panel} aria-label={M.sideLabel}>
      {content}
    </aside>
  );
};

"use client";

// 클라이언트 잎: 행 선택 이벤트를 다룬다. barrel 로 노출되므로 경계를 스스로 갖는다.
import { AssetIcon } from "@repo/ui/assetIcon";
import { Badge } from "@repo/ui/badge";
import { FlexBox } from "@repo/ui/flexBox";
import {
  ScrollTableContainer,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@repo/ui/table";
import { Text } from "@repo/ui/text";
import Link from "next/link";
import React, { ReactNode } from "react";

import { selectRowOnKey } from "../lib/rowSelection";
import { SEARCH_MESSAGES, WATCHLIST_ASSET_LABELS, WATCHLIST_MESSAGES } from "../model/messages";
import { AssetSearchItem, MarketAssetClass } from "../model/types";
import { ChangeRateCell } from "./ChangeRateCell";
import { PriceCell } from "./PriceCell";
import { nameLink } from "./WatchlistTable.css";

interface AssetSearchTableProps {
  items: readonly AssetSearchItem[];
  /** 행 클릭 · Enter — 상세로 간다(`FE-REQ-010` FR-73). 최근 검색 저장도 여기서 한다(부르는 쪽이 안다) */
  onSelect: (item: AssetSearchItem) => void;
  detailHref: (symbol: string) => string;
  /** ★ 자리 — 추가 · 제거는 `features/toggle-watchlist` 의 일이고 위젯이 꽂는다(`fsd-entities.md`) */
  renderAction?: (item: AssetSearchItem) => ReactNode;
  /**
   * ★ 칸이 기대는 바깥 상태(관심 목록 id 등)를 문자열로. **행은 `memoKey` 가 바뀔 때만 다시 그린다** — 검색 응답이 관심 목록보다
   * 먼저 오면 행이 옛 관심 목록으로 그려지고, 뒤에 온 관심 목록은 `memoKey` 가 같아 반영되지 않았다(별이 "제거"로 굳음, 2026-10-30 실측)
   */
  actionKey?: (item: AssetSearchItem) => string;
}

/**
 * 종목 검색 결과 표 (`FE-REQ-010` FR-72). 관심 종목 표와 같은 열 · 같은 셀이다 — 같은 종목이 두 화면에서 다르게 보이지 않게.
 * 다른 것은 `보유` 배지 하나다. 표시 전용 — 조회 · mutation 을 부르지 않는다
 */
export const AssetSearchTable = React.memo(({ items, onSelect, detailHref, renderAction, actionKey }: AssetSearchTableProps) => (
  <ScrollTableContainer maxHeight="viewport" hideScrollbar>
    <Table>
      <TableHeader bordered={false}>
        <TableRow>
          <TableHeaderCell align="left">{SEARCH_MESSAGES.columns.asset}</TableHeaderCell>
          <TableHeaderCell align="right">{SEARCH_MESSAGES.columns.price}</TableHeaderCell>
          <TableHeaderCell align="right">{SEARCH_MESSAGES.columns.change}</TableHeaderCell>
          <TableHeaderCell align="right">{SEARCH_MESSAGES.columns.assetType}</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const select = () => onSelect(item);
          return (
            <TableRow
              key={`${item.assetType}:${item.symbol}`}
              memoKey={`${item.currentPrice}-${item.changeRate}-${item.isTracked}-${item.isHeld}-${actionKey?.(item) ?? ""}`}
              hoverable
              clickable
              tabIndex={0}
              onClick={select}
              onKeyDown={selectRowOnKey(select)}
            >
              <TableCell align="left">
                <FlexBox align="center" gap="md">
                  {/* 별을 누르는 것은 행 선택(상세 이동)이 아니다 */}
                  <span onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                    {renderAction?.(item)}
                  </span>
                  <AssetIcon
                    // 국내 주식 코드(005930)는 이니셜이 "00" 이 된다 — 이름으로 만든다
                    symbol={item.assetType === MarketAssetClass.KrStock ? item.name : item.symbol}
                    src={item.logoUrl ?? undefined}
                    name={item.name}
                    size="md"
                  />
                  <FlexBox direction="column">
                    <Link
                      href={detailHref(item.symbol)}
                      prefetch={false}
                      className={nameLink}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelect(item);
                      }}
                    >
                      <Text variant="bodyLarge">{item.name}</Text>
                    </Link>
                    <Text variant="caption" color="tertiary">
                      {item.symbol}
                    </Text>
                  </FlexBox>
                  {item.isHeld ? (
                    <Badge tone="neutral" size="sm">
                      {SEARCH_MESSAGES.heldBadge}
                    </Badge>
                  ) : null}
                </FlexBox>
              </TableCell>
              <TableCell align="right">
                {item.currentPrice === null ? (
                  <Text variant="bodyLarge" color="tertiary">
                    {WATCHLIST_MESSAGES.priceUnknown}
                  </Text>
                ) : (
                  <PriceCell value={item.currentPrice} />
                )}
              </TableCell>
              <TableCell align="right">
                {item.changeRate === null ? (
                  <Text variant="bodyLarge" color="tertiary">
                    {WATCHLIST_MESSAGES.priceUnknown}
                  </Text>
                ) : (
                  <ChangeRateCell value={item.changeRate} />
                )}
              </TableCell>
              <TableCell align="right">
                {WATCHLIST_ASSET_LABELS[item.assetType] ? (
                  <Badge tone="neutral" size="sm">
                    {WATCHLIST_ASSET_LABELS[item.assetType]}
                  </Badge>
                ) : null}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </ScrollTableContainer>
));
AssetSearchTable.displayName = "AssetSearchTable";

"use client";

// 클라이언트 잎: 행 선택 이벤트를 다룬다. barrel 로 노출되므로 경계를 스스로 갖는다.
import { Badge } from "@repo/ui/badge";
import { FlexBox } from "@repo/ui/flexBox";
import { Image } from "@repo/ui/image";
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
import React, { KeyboardEvent, ReactNode } from "react";

import { WATCHLIST_ASSET_LABELS, WATCHLIST_MESSAGES } from "../model/messages";
import { WatchlistItem } from "../model/types";
import { ChangeRateCell } from "./ChangeRateCell";
import { PriceCell } from "./PriceCell";

interface WatchlistTableProps {
  items: readonly WatchlistItem[];
  selectedSymbol: string;
  onSelect: (symbol: string) => void;
  /**
   * 별 버튼 자리. **엔티티는 인터랙션을 모른다** — 추가·제거는
   * `features/toggle-watchlist` 의 일이고 위젯이 여기에 꽂는다 (`fsd-entities.md`).
   */
  renderAction?: (item: WatchlistItem) => ReactNode;
}

/** 관심 목록 표 헤더. 실시간 테이블의 5컬럼과 다르다 — 그쪽은 변경 금지 목록이다. */
const WATCHLIST_HEADERS = [
  { id: "currentPrice", value: "현재가" },
  { id: "changeRate", value: "변동률" },
  { id: "assetType", value: "자산군" },
] as const;

/**
 * 행 선택을 키보드로도 연다 (`FE-REQ-010` FR-60).
 *
 * Space 는 기본 동작이 스크롤이라 막는다. 그러지 않으면 선택과 동시에 목록이 한 화면
 * 내려가서, 방금 고른 행이 시야 밖으로 나간다.
 */
const selectOnKey =
  (onSelect: () => void) => (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect();
  };

/** 표시 전용 (`fsd-entities.md`). 조회·mutation 을 부르지 않는다. */
export const WatchlistTable = React.memo(
  ({ items, selectedSymbol, onSelect, renderAction }: WatchlistTableProps) => {
    return (
      <ScrollTableContainer maxHeight="800px" hideScrollbar>
        <Table>
          <TableHeader bordered={false}>
            <TableRow>
              <TableHeaderCell align="left">종목</TableHeaderCell>
              {WATCHLIST_HEADERS.map((th) => (
                <TableHeaderCell key={th.id} align="right">
                  {th.value}
                </TableHeaderCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const selected = item.symbol === selectedSymbol;
              const select = () => onSelect(item.symbol);

              return (
                <TableRow
                  key={item.id}
                  memoKey={`${item.currentPrice}-${item.priceStale}-${selected}`}
                  hoverable
                  clickable
                  selected={selected}
                  tabIndex={0}
                  aria-selected={selected}
                  onClick={select}
                  onKeyDown={selectOnKey(select)}
                >
                  <TableCell align="left">
                    <FlexBox align="center" gap="md">
                      {/*
                        별을 누르는 것은 **행 선택이 아니다.** 막지 않으면 제거 클릭이
                        그 행을 선택하고, 사라진 행 때문에 프리뷰가 빈 심볼을 가리킨다.
                      */}
                      <span
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        {renderAction?.(item)}
                      </span>
                      {/*
                        로고가 없으면 **영역을 렌더하지 않는다.** 주식에는 업비트 로고가
                        없고, 없는 URL 을 넣으면 깨진 이미지가 그려진다.
                      */}
                      {item.logoUrl ? (
                        <Image
                          radius={9999}
                          width={30}
                          height={30}
                          src={item.logoUrl}
                          alt={item.name}
                        />
                      ) : null}
                      <FlexBox direction="column">
                        <Text variant="bodyLarge">{item.name}</Text>
                        <Text variant="caption" color="tertiary">
                          {item.symbol}
                        </Text>
                      </FlexBox>
                      {item.priceStale ? (
                        <Badge
                          tone="warning"
                          size="sm"
                          title={WATCHLIST_MESSAGES.staleBadgeTitle}
                        >
                          {WATCHLIST_MESSAGES.staleBadge}
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
    );
  },
);
WatchlistTable.displayName = "WatchlistTable";

export default WatchlistTable;

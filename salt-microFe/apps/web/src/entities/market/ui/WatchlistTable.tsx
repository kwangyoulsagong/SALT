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
import { WATCHLIST_ASSET_LABELS, WATCHLIST_MESSAGES } from "../model/messages";
import { WatchlistItem } from "../model/types";
import { ChangeRateCell } from "./ChangeRateCell";
import { PriceCell } from "./PriceCell";
import { nameLink } from "./WatchlistTable.css";

interface WatchlistTableProps {
  items: readonly WatchlistItem[];
  selectedSymbol: string;
  /** 행 클릭 · Enter — 상세로 간다 */
  onSelect: (symbol: string) => void;
  /** hover · 포커스 — 우측 미리보기만 바꾼다 */
  onPreview: (symbol: string) => void;
  /** 종목 이름 링크의 주소 — 모드를 싣는 규칙은 부르는 쪽(위젯)이 안다 */
  detailHref: (symbol: string) => string;
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

/** 표시 전용 (`fsd-entities.md`). 조회·mutation 을 부르지 않는다. */
export const WatchlistTable = React.memo(
  ({
    items,
    selectedSymbol,
    onSelect,
    onPreview,
    detailHref,
    renderAction,
  }: WatchlistTableProps) => {
    return (
      <ScrollTableContainer maxHeight="viewport" hideScrollbar>
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
                  tabIndex={0}
                  aria-selected={selected}
                  onMouseEnter={() => onPreview(item.symbol)}
                  onFocus={() => onPreview(item.symbol)}
                  onClick={select}
                  onKeyDown={selectRowOnKey(select)}
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
                        로고 자리는 **늘 있다** — 로고가 없으면(주식에는 업비트 로고가 없다)
                        이니셜 아이콘이다. 없는 URL 을 넣지 않는다 — 깨진 이미지가 그려진다.
                      */}
                      <AssetIcon
                        symbol={item.symbol}
                        src={item.logoUrl ?? undefined}
                        name={item.name}
                        size="md"
                      />
                      <FlexBox direction="column">
                        <Link
                          href={detailHref(item.symbol)}
                          prefetch={false}
                          className={nameLink}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Text variant="bodyLarge">{item.name}</Text>
                        </Link>
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

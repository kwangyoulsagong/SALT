"use client";

import { IconButton } from "@repo/ui/iconButton";
import { StarIcon } from "@repo/ui/starIcon";
import React, { useCallback } from "react";

import {
  AddWatchlistRequest,
  WATCHLIST_MESSAGES,
  WatchlistItem,
} from "@/entities/market";

import { useToggleWatchlist } from "../api/useToggleWatchlist";

interface WatchlistStarButtonProps {
  /** 이미 담겨 있으면 그 항목. `undefined` 면 빈 별이고 누르면 추가다 */
  entry: WatchlistItem | undefined;
  request: AddWatchlistRequest;
  /** 표시 이름. 추가 요청의 `name` 과 같지만 라벨 문구가 이것을 쓴다 */
  displayName: string;
}

/**
 * 관심 종목 별.
 *
 * 원문은 `<StarIcon />` 하나였다 — **핸들러도 라벨도 상태도 없는 장식**이라 실시간
 * 테이블의 별을 눌러도 아무 일이 없었다. 여기서 세 가지가 생긴다: 누를 수 있는 것,
 * 담겨 있는지 보이는 것, 스크린리더가 읽을 수 있는 것(`FE-REQ-010` FR-65).
 *
 * 토글 중에는 비활성이다. 연타로 추가와 제거가 교차하면 마지막 응답이 이기고, 그게
 * 화면에 보이는 것과 다를 수 있다.
 */
export const WatchlistStarButton = React.memo(
  ({ entry, request, displayName }: WatchlistStarButtonProps) => {
    const toggle = useToggleWatchlist();

    const onClick = useCallback(() => {
      // `disabled` 를 두고도 막는다. 이 버튼은 `TableRow` 안에 있고 그 행은 `memoKey`
      // 만 비교하므로, 부모가 넘기는 prop 변화가 늦게 반영될 수 있다. 진행 중 클릭은
      // 같은 항목에 DELETE 를 두 번 보내 404 를 만든다.
      if (toggle.isPending) return;
      toggle.mutate({ entry, request });
    }, [entry, request, toggle]);

    const label = entry
      ? WATCHLIST_MESSAGES.remove(displayName)
      : WATCHLIST_MESSAGES.add(displayName);

    return (
      <IconButton
        icon={<StarIcon filled={Boolean(entry)} />}
        label={label}
        size="sm"
        aria-pressed={Boolean(entry)}
        disabled={toggle.isPending}
        onClick={onClick}
      />
    );
  },
);
WatchlistStarButton.displayName = "WatchlistStarButton";

export default WatchlistStarButton;

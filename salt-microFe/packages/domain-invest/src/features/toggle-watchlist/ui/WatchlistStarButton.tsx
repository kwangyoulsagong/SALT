"use client";

import { IconButton } from "@repo/ui/iconButton";
import { StarIcon } from "@repo/ui/starIcon";
import React, { useCallback } from "react";

import { useHasSession } from "@repo/web-shared/api";
import { GUEST_GLASS_MESSAGES } from "@repo/web-shared/i18n";
import { useSignInHref } from "@repo/web-shared/ui";

import {
  AddWatchlistRequest,
  WATCHLIST_MESSAGES,
  WatchlistItem,
} from "@/entities/market";

import { isTrackedLimitError, useToggleWatchlist } from "../api/useToggleWatchlist";
import { guestStar } from "./watchlistStarButton.css";

interface WatchlistStarButtonProps {
  /** 이미 담겨 있으면 그 항목. `undefined` 면 빈 별이고 누르면 추가다 */
  entry: WatchlistItem | undefined;
  request: AddWatchlistRequest;
  /** 표시 이름. 추가 요청의 `name` 과 같지만 라벨 문구가 이것을 쓴다 */
  displayName: string;
  /**
   * 보유 종목 — 늘 추적되므로 별이 차 있고 해제할 수 없다. mutation 을 보내지 않는다(`FE-REQ-011` FR-7 · `FE-REQ-010` FR-74)
   */
  held?: boolean;
  /** 추적 상한 409 — 부르는 화면이 인라인 안내를 띄운다(`FE-REQ-010` FR-75). 없으면 아무것도 하지 않는다 */
  onTrackedLimit?: () => void;
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
  ({ entry, request, displayName, held = false, onTrackedLimit }: WatchlistStarButtonProps) => {
    const toggle = useToggleWatchlist();
    // 게스트(`FE-REQ-070` FR-7) — ★ 는 사람 칸이다. 누르면 로그인 뒤 같은 자리로. 세션을 모를 때(null)는 평소 별(비활성 아님)
    const signedIn = useHasSession();
    const signInHref = useSignInHref();

    const onClick = useCallback((event: React.MouseEvent) => {
      // 별은 시세 표 행 안에 있고 행 클릭은 상세로 간다 — 멈추지 않으면 별을 누를 때 화면이 넘어간다(2026-10-08 실측)
      event.stopPropagation();
      // `disabled` 를 두고도 막는다. 이 버튼은 `TableRow` 안에 있고 그 행은 `memoKey`
      // 만 비교하므로, 부모가 넘기는 prop 변화가 늦게 반영될 수 있다. 진행 중 클릭은
      // 같은 항목에 DELETE 를 두 번 보내 404 를 만든다.
      if (toggle.isPending || held) return;
      toggle.mutate(
        { entry, request },
        {
          onError: (error) => {
            if (isTrackedLimitError(error)) onTrackedLimit?.();
          },
        },
      );
    }, [entry, request, toggle, held, onTrackedLimit]);

    if (signedIn === false) {
      return (
        <a
          className={guestStar}
          href={signInHref}
          aria-label={GUEST_GLASS_MESSAGES.watchlistAction(displayName)}
          title={GUEST_GLASS_MESSAGES.watchlistAction(displayName)}
          // 별은 시세 표 행 안 — 행 클릭(상세 이동)으로 번지지 않게
          onClick={(event) => event.stopPropagation()}
        >
          <StarIcon filled={false} />
        </a>
      );
    }

    const tracked = held || Boolean(entry);
    const label = held
      ? WATCHLIST_MESSAGES.heldAlwaysTracked
      : entry
        ? WATCHLIST_MESSAGES.remove(displayName)
        : WATCHLIST_MESSAGES.add(displayName);

    return (
      <IconButton
        icon={<StarIcon filled={tracked} />}
        label={label}
        title={held ? WATCHLIST_MESSAGES.heldAlwaysTracked : undefined}
        size="sm"
        aria-pressed={tracked}
        disabled={toggle.isPending || held}
        onClick={onClick}
      />
    );
  },
);
WatchlistStarButton.displayName = "WatchlistStarButton";

export default WatchlistStarButton;

"use client";

import { clampActiveIndex, isSearchListKey, moveActiveIndex } from "@repo/core/search";
import { type KeyboardEvent, useCallback, useEffect, useState } from "react";

/**
 * 검색 모달 키보드(`FE-REQ-066` FR-5) — **포커스는 검색칸에 그대로**, ↑↓ · Home · End 가 고른 행만 옮긴다(`aria-activedescendant`).
 * Enter = 고른 행을 연다. 판정은 `@repo/core/search` 순수 함수(경계 표 테스트)이고 여기는 상태만 쥔다.
 *
 * `resetKey` 가 바뀌면(검색어 · 목록이 바뀜) 고른 행을 푼다 — 다른 목록의 3번째 행을 고른 채 남지 않게.
 * 고른 행 없이 Enter 면 아무것도 하지 않는다(첫 행으로 데려가지 않는다 — 무엇을 열지 모르는 채 이동하지 않게)
 */
export const useSearchListKeys = ({
  count,
  resetKey,
  onOpen,
}: {
  count: number;
  resetKey: string;
  onOpen: (index: number) => void;
}) => {
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => setActiveIndex(-1), [resetKey]);
  const active = clampActiveIndex(activeIndex, count);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.nativeEvent.isComposing) return;
      const key = event.key;
      if (isSearchListKey(key)) {
        // Home · End 는 글자가 있으면 커서 이동이다 — 목록 키로 쓰지 않는다
        if ((key === "Home" || key === "End") && (event.currentTarget as HTMLInputElement).value) return;
        event.preventDefault();
        setActiveIndex((current) => moveActiveIndex(current, count, key));
        return;
      }
      if (event.key === "Enter" && active >= 0) {
        event.preventDefault();
        onOpen(active);
      }
    },
    [active, count, onOpen],
  );

  return { activeIndex: active, setActiveIndex, onKeyDown };
};

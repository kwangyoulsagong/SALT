"use client";

import { useEffect } from "react";

/**
 * 오버레이가 열려 있는 동안 뒤 배경 스크롤을 잠근다.
 * BottomSheet · Modal · Dialog가 같이 쓴다.
 */
export const useScrollLock = (locked: boolean) => {
  useEffect(() => {
    if (!locked) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [locked]);
};

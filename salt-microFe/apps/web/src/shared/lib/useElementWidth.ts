"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 요소의 현재 폭(px)을 따라간다.
 *
 * SVG 차트처럼 **폭을 숫자로 받아 좌표를 계산하는** 컴포넌트는 CSS 로 줄여도 안쪽
 * 좌표가 그대로라 부모 밖으로 튀어나온다. 이 훅이 부모 폭을 재서 숫자로 넘긴다.
 *
 * 첫 측정 전에는 `fallback` 을 돌려준다 — 측정은 `useEffect` 안에서만 한다(`ssr.md`).
 * 같은 폭이면 상태를 바꾸지 않아 리렌더가 생기지 않는다.
 */
export const useElementWidth = <T extends HTMLElement>(fallback: number) => {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const next = Math.floor(entry.contentRect.width);
      if (next > 0) setWidth((prev) => (prev === next ? prev : next));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
};

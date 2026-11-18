"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * 요소의 현재 폭(px)을 따라간다.
 *
 * SVG 차트처럼 **폭을 숫자로 받아 좌표를 계산하는** 컴포넌트는 CSS 로 줄여도 안쪽
 * 좌표가 그대로라 부모 밖으로 튀어나온다. 이 훅이 부모 폭을 재서 숫자로 넘긴다.
 *
 * 첫 측정 전에는 `fallback` 을 돌려준다 — 측정은 `useEffect` 안에서만 한다(`ssr.md`).
 * 같은 폭이면 상태를 바꾸지 않아 리렌더가 생기지 않는다.
 *
 * **ref 는 콜백이다(2026-11-18).** 전에는 객체 ref 를 첫 마운트 때 한 번만 봐서, 재는 칸이 데이터가 온 뒤에 붙으면
 * 폭이 `fallback` 으로 굳었다(포트폴리오 평가금 흐름 320px — 투자 미리보기 차트는 같은 결함을 "측정 상자를 늘 둔다" 주석으로 피했다).
 * 이제 칸이 언제 붙든 · 바뀌든 그 칸을 본다
 */
export const useElementWidth = <T extends HTMLElement>(fallback: number) => {
  const [element, setElement] = useState<T | null>(null);
  const [width, setWidth] = useState(fallback);
  const ref = useCallback((node: T | null) => setElement(node), []);

  useEffect(() => {
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const next = Math.floor(entry.contentRect.width);
      if (next > 0) setWidth((prev) => (prev === next ? prev : next));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return [ref, width] as const;
};

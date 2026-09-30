"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

/** 서버에서는 `useLayoutEffect` 가 경고만 낸다 — 브라우저에서만 쓴다 */
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * 선택 표시가 새 항목으로 미끄러진다 (FE-REQ-044 FR-34 · P-31).
 *
 * 컨테이너 안에서 `activeSelector` 에 맞는 요소의 위치 · 폭을 재서 표시 하나를 `transform` 으로 옮긴다.
 * 항목마다 표시를 두고 켜고 끄면 옮겨 가는 과정이 없다. 컨테이너는 `position: relative` 여야 한다.
 *
 * - 첫 측정 전(서버 HTML · 하이드레이션)에는 `sliding` 이 false — 항목 자신의 선택 스타일이 보인다.
 * - 첫 측정은 제자리에 놓기만 하고, 그다음 프레임부터 `animated` 가 켜져 옮겨 간다(0 에서 날아오지 않는다).
 * - 폭은 즉시 바뀌고 위치만 움직인다(레이아웃 속성은 애니메이션하지 않는다).
 */
export const useSlidingIndicator = <T extends HTMLElement>(activeKey: unknown, activeSelector: string) => {
  const containerRef = useRef<T>(null);
  const [box, setBox] = useState<{ x: number; width: number } | null>(null);
  const [animated, setAnimated] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const measure = () => {
      const active = container.querySelector<HTMLElement>(activeSelector);
      setBox(active ? { x: active.offsetLeft, width: active.offsetWidth } : null);
    };
    measure();

    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [activeKey, activeSelector]);

  useEffect(() => {
    if (!box || animated) return undefined;
    const frame = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(frame);
  }, [box, animated]);

  const indicatorStyle: CSSProperties | undefined = box
    ? { width: box.width, transform: `translateX(${box.x}px)` }
    : undefined;

  return { containerRef, indicatorStyle, sliding: box !== null, animated };
};

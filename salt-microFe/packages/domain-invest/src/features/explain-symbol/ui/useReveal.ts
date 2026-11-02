"use client";

import { useEffect, useRef, useState } from "react";

/** 한 글자씩 드러나는 속도 — 한국어 읽는 속도(초당 15~20자)보다 빨라야 기다리는 느낌이 없다 */
const CHARS_PER_SECOND = 90;

/**
 * 도착한 글자를 타자처럼 드러낸다(FEATURE-008 FR-63). 서버는 문장을 통째로 보내므로 글자를 지어내지 않고
 * **보여 주는 속도만** 정한다. `instant` 거나 줄인 모션이면 한 번에 다 보인다(FR-64).
 */
export const useReveal = (total: number, instant: boolean) => {
  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (instant || reduce) {
      shownRef.current = total;
      setShown(total);
      return undefined;
    }
    if (shownRef.current >= total) return undefined;

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const next = Math.min(total, shownRef.current + ((now - last) / 1000) * CHARS_PER_SECOND);
      last = now;
      shownRef.current = next;
      setShown(Math.floor(next));
      if (next < total) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [total, instant]);

  return Math.min(shown, total);
};

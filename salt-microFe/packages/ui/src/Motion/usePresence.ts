"use client";

import { tokens } from "@repo/tokens";
import { useEffect, useState } from "react";

/**
 * 닫힐 때 퇴장 애니메이션이 끝난 뒤 DOM 에서 뺀다 (FE-REQ-044 FR-35 · P-32).
 *
 * `open` 이 false 가 되면 `closing` 을 켜고 `duration.base` 뒤에 `rendered` 를 끈다.
 * 스크롤 잠금 · 포커스 가두기는 `open` 을 따르므로 닫는 순간 풀린다 — 퇴장 중에 뒤 화면을 막지 않는다.
 * 줄인 모션이면 기다리지 않는다.
 */
export const usePresence = (open: boolean) => {
  const [rendered, setRendered] = useState(open);

  useEffect(() => {
    if (open) {
      setRendered(true);
      return undefined;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setRendered(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setRendered(false), tokens.motion.duration.base * 1000);
    return () => window.clearTimeout(timer);
  }, [open]);

  return { rendered: open || rendered, closing: !open && rendered };
};

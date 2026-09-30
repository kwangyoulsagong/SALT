"use client";

import { tokens } from "@repo/tokens";
import { useEffect, useRef, useState } from "react";

const { duration, easing } = tokens.motion;

/** 3차 베지어 이징 — 토큰의 `enter` 곡선을 그대로 따른다 */
const bezier = ([x1, y1, x2, y2]: readonly number[]) => (t: number) => {
  // x(s) = t 를 뉴턴법으로 풀고 y(s) 를 돌려준다
  const cx = 3 * x1!, bx = 3 * (x2! - x1!) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1!, by = 3 * (y2! - y1!) - cy, ay = 1 - cy - by;
  let s = t;
  for (let i = 0; i < 6; i += 1) {
    const x = ((ax * s + bx) * s + cx) * s - t;
    const dx = (3 * ax * s + 2 * bx) * s + cx;
    if (Math.abs(dx) < 1e-6) break;
    s -= x / dx;
  }
  return ((ay * s + by) * s + cy) * s;
};

const easeEnter = bezier(easing.enter);

const decimalsOf = (value: number) => {
  const text = String(value);
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
};

/**
 * 숫자 굴러가기 (FE-REQ-044 FR-31 · P-36).
 *
 * **값이 바뀔 때만** 이전 값에서 새 값으로 `duration.base` 동안 굴러간다 — 첫 렌더는 값 그대로라 서버 HTML 과 같다.
 * 도착값은 서버가 준 값 그대로다(계산하지 않고 보여 주는 중간값만 만든다). 소수 자릿수는 도착값에 맞춘다.
 * 줄인 모션이면 즉시 바뀐다. 초당 여러 번 바뀌는 시세에는 쓰지 않는다(`motion.md` §5).
 */
export const useRolledNumber = (value: number) => {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);

  useEffect(() => {
    const from = shownRef.current;
    if (from === value) return undefined;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      shownRef.current = value;
      setShown(value);
      return undefined;
    }

    const places = decimalsOf(value);
    const factor = 10 ** places;
    const total = duration.base * 1000;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / total);
      const next = progress === 1 ? value : Math.round((from + (value - from) * easeEnter(progress)) * factor) / factor;
      shownRef.current = next;
      setShown(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return shown;
};

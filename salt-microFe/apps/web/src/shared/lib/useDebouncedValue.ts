"use client";

import { useEffect, useState } from "react";

/** 값이 `delay` 동안 멈춘 뒤에만 바뀐다. 입력마다 서버 계산을 부르지 않기 위해 쓴다(FEATURE-009 UX 300ms) */
export const useDebouncedValue = <T,>(value: T, delay: number): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

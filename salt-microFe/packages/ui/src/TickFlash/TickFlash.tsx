"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { tickFlashStyles, tickFlashWrapper } from "./styles/tickFlash.css";

export interface TickFlashProps {
  /** 비교할 숫자. 이전보다 크면 상승색, 작으면 하락색 면이 한 번 옅어진다 */
  value: number;
  children: ReactNode;
  className?: string;
}

/**
 * 시세 변동 깜빡임 (FE-REQ-044 FR-32 · P-37).
 *
 * 값이 **바뀔 때만** 방향 색 면이 `duration.slow` 동안 옅어진다. 첫 렌더 · 같은 값은 가만히 있다.
 * 면은 `::before` 의 `opacity` 만 움직인다(배경색 애니메이션은 페인트를 부른다). 방향은 색만이 아니라
 * 옆 등락률 글자(부호)가 같이 말한다 — 이 컴포넌트는 `aria-live` 를 두지 않는다(스크린리더를 시끄럽게 하지 않는다).
 */
export const TickFlash = ({ value, children, className }: TickFlashProps) => {
  const previous = useRef(value);
  const [flash, setFlash] = useState<{ direction: "up" | "down"; count: number } | null>(null);

  useEffect(() => {
    if (value === previous.current) return;
    const direction = value > previous.current ? "up" : "down";
    previous.current = value;
    setFlash((current) => ({ direction, count: (current?.count ?? 0) + 1 }));
  }, [value]);

  return (
    <span className={`${tickFlashWrapper} ${className || ""}`}>
      {flash ? <span key={flash.count} className={tickFlashStyles({ direction: flash.direction })} aria-hidden="true" /> : null}
      {children}
    </span>
  );
};

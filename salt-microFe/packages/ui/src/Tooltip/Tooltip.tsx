"use client";

import { useCallback, useId, useState } from "react";
import type { KeyboardEvent, ReactElement, ReactNode } from "react";
import { bubbleStyles, wrapperStyles } from "./styles/tooltip.css";

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

export interface TooltipProps {
  /** 설명할 대상. 포커스를 받을 수 있는 요소여야 키보드로도 열린다. */
  children: ReactElement | ReactNode;
  content: ReactNode;
  placement?: TooltipPlacement;
  className?: string;
}

/**
 * 지표·용어 설명을 붙인다.
 * 마우스 hover와 키보드 focus 둘 다에서 열리고 ESC로 닫힌다.
 *
 * 대상 요소를 감싸는 `span` 기준으로 위치를 잡기 때문에,
 * 좁은 스크롤 컨테이너 안에서는 말풍선이 잘릴 수 있다.
 * 그럴 때는 `placement`를 바꾼다.
 */
export const Tooltip = ({
  children,
  content,
  placement = "top",
  className,
}: TooltipProps) => {
  const [open, setOpen] = useState(false);
  const id = useId();

  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);

  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === "Escape" && open) {
      event.stopPropagation();
      hide();
    }
  };

  return (
    <span
      className={`${wrapperStyles} ${className || ""}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={handleKeyDown}
      aria-describedby={open ? id : undefined}
    >
      {children}
      {open ? (
        <span role="tooltip" id={id} className={bubbleStyles({ placement })}>
          {content}
        </span>
      ) : null}
    </span>
  );
};

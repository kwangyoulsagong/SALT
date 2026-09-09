"use client";

import { useCallback, useId, useRef } from "react";
import type { MouseEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "../Utils/hooks/useFocusTrap";
import { usePortal } from "../Utils/hooks/usePortal";
import { useScrollLock } from "../Utils/hooks/useScrollLock";
import {
  bodyStyles,
  grabberStyles,
  overlayStyles,
  sheetStyles,
  titleStyles,
} from "./styles/bottomSheet.css";

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: ReactNode;
  /** 위쪽 손잡이 표시 */
  grabber?: boolean;
  /** `title`이 없을 때 스크린 리더가 읽을 이름 */
  label?: string;
  className?: string;
}

export const BottomSheet = ({
  open,
  onClose,
  children,
  title,
  grabber = true,
  label = "바텀 시트",
  className,
}: BottomSheetProps) => {
  const mounted = usePortal();
  const sheetRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const handleEscape = useCallback(() => onClose(), [onClose]);

  useScrollLock(open);
  useFocusTrap(sheetRef, open, { onEscape: handleEscape });

  if (!mounted || !open) return null;

  const stopPropagation = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return createPortal(
    <div className={overlayStyles} onClick={onClose}>
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : label}
        tabIndex={-1}
        onClick={stopPropagation}
        className={`${sheetStyles} ${className || ""}`}
      >
        {grabber ? <div className={grabberStyles} aria-hidden="true" /> : null}
        {title ? (
          <h2 id={titleId} className={titleStyles}>
            {title}
          </h2>
        ) : null}
        <div className={bodyStyles}>{children}</div>
      </div>
    </div>,
    document.body
  );
};

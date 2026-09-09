"use client";

import { useCallback, useId, useRef } from "react";
import type { MouseEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { IconButton } from "../IconButton/IconButton";
import { useFocusTrap } from "../Utils/hooks/useFocusTrap";
import { usePortal } from "../Utils/hooks/usePortal";
import { useScrollLock } from "../Utils/hooks/useScrollLock";
import {
  bodyStyles,
  footerStyles,
  headerStyles,
  overlayStyles,
  panelStyles,
  titleStyles,
} from "./styles/modal.css";

export type ModalSize = "sm" | "md" | "lg";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: ReactNode;
  /** 아래쪽 버튼 영역 */
  footer?: ReactNode;
  size?: ModalSize;
  /** 닫기 버튼 숨김. 확인을 강제해야 하는 화면에 쓴다. */
  hideCloseButton?: boolean;
  /** 배경을 눌러도 닫히지 않게 한다. */
  disableBackdropClose?: boolean;
  /** `title`이 없을 때 스크린 리더가 읽을 이름 */
  label?: string;
  className?: string;
}

/**
 * 화면 가운데 뜨는 오버레이.
 * 모바일에서 아래에서 올라오는 형태가 맞으면 `BottomSheet`를 쓴다.
 */
export const Modal = ({
  open,
  onClose,
  children,
  title,
  footer,
  size = "md",
  hideCloseButton = false,
  disableBackdropClose = false,
  label = "대화 상자",
  className,
}: ModalProps) => {
  const mounted = usePortal();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const handleEscape = useCallback(() => onClose(), [onClose]);

  useScrollLock(open);
  useFocusTrap(panelRef, open, { onEscape: handleEscape });

  if (!mounted || !open) return null;

  const stopPropagation = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return createPortal(
    <div
      className={overlayStyles}
      onClick={disableBackdropClose ? undefined : onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : label}
        tabIndex={-1}
        onClick={stopPropagation}
        className={`${panelStyles({ size })} ${className || ""}`}
      >
        {title || !hideCloseButton ? (
          <div className={headerStyles}>
            {title ? (
              <h2 id={titleId} className={titleStyles}>
                {title}
              </h2>
            ) : (
              <span className={titleStyles} />
            )}
            {hideCloseButton ? null : (
              <IconButton
                icon={<X size={20} aria-hidden="true" />}
                label="닫기"
                onClick={onClose}
              />
            )}
          </div>
        ) : null}

        <div className={bodyStyles}>{children}</div>

        {footer ? <div className={footerStyles}>{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
};

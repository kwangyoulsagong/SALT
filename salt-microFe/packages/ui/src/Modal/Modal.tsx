"use client";

import { useCallback, useId, useRef } from "react";
import type { MouseEvent, ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { IconButton } from "../IconButton/IconButton";
import { usePresence } from "../Motion/usePresence";
import { useFocusTrap } from "../Utils/hooks/useFocusTrap";
import { usePortal } from "../Utils/hooks/usePortal";
import { useScrollLock } from "../Utils/hooks/useScrollLock";
import {
  articleBodyStyles,
  articleHeaderStyles,
  articleOverlayStyles,
  articleTitleStyles,
  bodyStyles,
  footerStyles,
  headerStyles,
  overlayClosingStyles,
  overlayStyles,
  panelClosingStyles,
  panelStyles,
  searchBodyStyles,
  searchOverlayStyles,
  titleStyles,
} from "./styles/modal.css";

/**
 * `article` — 읽는 모달(뉴스 상세, `FE-REQ-065`): 폭 680 · 위아래 여백 40 · 모서리 16 · 제목 18/700/24 · 본문 14/24.
 * 데스크톱 글자 위계(`screen-desktop.md` §2)를 따른다 — 나머지 크기는 모바일 t 단계 그대로
 * `search` — 검색 모달(`FE-REQ-066`): 폭 640 · 높이 최대 600 · 위 8 · 모서리 16 · 배경 막 없음. 머리 · 여백 없이 안이 칸을 나눈다
 */
export type ModalSize = "sm" | "md" | "lg" | "article" | "search";

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
  /** ESC 를 눌렀을 때 — 없으면 `onClose`. 두 단계 ESC(검색 모달: 지우기 → 닫기)는 부르는 쪽이 정한다 */
  onEscape?: () => void;
  /** 열릴 때 포커스를 줄 요소 — 없으면 판(`FE-REQ-066` FR-1: 검색칸) */
  initialFocusRef?: RefObject<HTMLElement | null>;
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
  onEscape,
  initialFocusRef,
  className,
}: ModalProps) => {
  const mounted = usePortal();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const handleEscape = useCallback(() => (onEscape ?? onClose)(), [onEscape, onClose]);

  useScrollLock(open);
  // 처음부터 열린 채 그려질 때(주소로 연 모달) 첫 렌더엔 포털이 없다 — 판이 생긴 뒤에 가둔다
  useFocusTrap(panelRef, open && mounted, { onEscape: handleEscape, initialFocusRef });
  const { rendered, closing } = usePresence(open);

  if (!mounted || !rendered) return null;

  const stopPropagation = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return createPortal(
    <div
      className={`${overlayStyles} ${size === "article" ? articleOverlayStyles : ""} ${size === "search" ? searchOverlayStyles : ""} ${closing ? overlayClosingStyles : ""}`}
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
        className={`${panelStyles({ size })} ${closing ? panelClosingStyles : ""} ${className || ""}`}
      >
        {title || !hideCloseButton ? (
          <div className={`${headerStyles} ${size === "article" ? articleHeaderStyles : ""}`}>
            {title ? (
              <h2 id={titleId} className={`${titleStyles} ${size === "article" ? articleTitleStyles : ""}`}>
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

        <div className={`${bodyStyles} ${size === "article" ? articleBodyStyles : ""} ${size === "search" ? searchBodyStyles : ""}`}>
          {children}
        </div>

        {footer ? <div className={footerStyles}>{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
};

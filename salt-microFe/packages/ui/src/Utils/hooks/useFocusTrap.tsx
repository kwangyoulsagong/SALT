"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export interface UseFocusTrapOptions {
  /** ESC를 눌렀을 때. 넘기지 않으면 ESC를 처리하지 않는다. */
  onEscape?: () => void;
  /** 열릴 때 포커스를 줄 요소 — 없으면 컨테이너(`FE-REQ-066` FR-1: 검색 모달은 검색칸) */
  initialFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * `active`인 동안 포커스를 `containerRef` 안에 가둔다.
 * 열릴 때 컨테이너로 포커스를 옮기고, 닫힐 때 직전 요소로 되돌린다.
 */
export const useFocusTrap = (
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  { onEscape, initialFocusRef }: UseFocusTrapOptions = {}
) => {
  // ESC 처리기는 렌더마다 바뀌어도 가둠을 다시 걸지 않는다 — 다시 걸면 정리가 포커스를 연 자리로 돌렸다가 컨테이너로 다시 옮긴다
  // (입력 중 모달 밖으로 포커스가 튀는 결함 — 2026-11-09 검색 모달). 최신 처리기는 ref 로 읽는다
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!active) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const container = containerRef.current;
    (initialFocusRef?.current ?? container)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && onEscapeRef.current) {
        event.preventDefault();
        onEscapeRef.current();
        return;
      }

      if (event.key !== "Tab" || !container) return;

      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );

      if (focusables.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = focusables[0] as HTMLElement;
      const last = focusables[focusables.length - 1] as HTMLElement;
      const activeElement = document.activeElement;

      if (event.shiftKey && (activeElement === first || activeElement === container)) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [containerRef, active, initialFocusRef]);
};

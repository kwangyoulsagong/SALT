"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { itemStyles, listStyles, wrapperStyles } from "./styles/menu.css";

export type MenuAlign = "start" | "end";
export type MenuItemTone = "default" | "danger";

export interface MenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  tone?: MenuItemTone;
  disabled?: boolean;
}

export interface MenuTriggerProps {
  onClick: () => void;
  "aria-haspopup": "menu";
  "aria-expanded": boolean;
}

export interface MenuProps {
  /**
   * 메뉴를 여는 버튼을 직접 렌더한다.
   * 넘겨받은 props를 실제 `button`에 그대로 펼쳐야 aria가 맞는다.
   */
  trigger: (props: MenuTriggerProps) => ReactNode;
  items: MenuItem[];
  onSelect: (id: string) => void;
  align?: MenuAlign;
  /** 메뉴 자체의 이름. 스크린 리더가 읽는다. */
  label?: string;
  className?: string;
}

/** 더보기 같은 짧은 액션 목록. 항목이 많거나 모바일이면 `BottomSheet`를 쓴다. */
export const Menu = ({
  trigger,
  items,
  onSelect,
  align = "end",
  label = "더보기 메뉴",
  className,
}: MenuProps) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const close = useCallback(() => setOpen(false), []);

  // 바깥을 누르면 닫는다.
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: globalThis.MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        close();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, close]);

  useEffect(() => {
    if (open) {
      itemRefs.current[activeIndex]?.focus();
    }
  }, [open, activeIndex]);

  const step = (delta: number) => {
    const enabled = items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !item.disabled);

    if (enabled.length === 0) return;

    const currentPosition = enabled.findIndex(
      ({ index }) => index === activeIndex
    );
    const nextPosition =
      (currentPosition + delta + enabled.length) % enabled.length;
    setActiveIndex(enabled[nextPosition]?.index ?? activeIndex);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!open) return;

    switch (event.key) {
      case "Escape":
        event.preventDefault();
        close();
        break;
      case "ArrowDown":
        event.preventDefault();
        step(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        step(-1);
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(items.findIndex((item) => !item.disabled));
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(
          items.reduce(
            (last, item, index) => (item.disabled ? last : index),
            activeIndex
          )
        );
        break;
      default:
        break;
    }
  };

  const select = (item: MenuItem) => {
    if (item.disabled) return;
    onSelect(item.id);
    close();
  };

  return (
    <div
      ref={wrapperRef}
      className={`${wrapperStyles} ${className || ""}`}
      onKeyDown={handleKeyDown}
    >
      {trigger({
        onClick: () => {
          setActiveIndex(items.findIndex((item) => !item.disabled));
          setOpen((prev) => !prev);
        },
        "aria-haspopup": "menu",
        "aria-expanded": open,
      })}

      {open ? (
        <ul role="menu" aria-label={label} className={listStyles({ align })}>
          {items.map((item, index) => (
            <li key={item.id} role="none">
              <button
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                tabIndex={index === activeIndex ? 0 : -1}
                className={itemStyles({ tone: item.tone || "default" })}
                onClick={() => select(item)}
              >
                {item.icon}
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

"use client";

import type { ReactNode } from "react";
import {
  badgeSlotStyles,
  barStyles,
  labelStyles,
  tabStyles,
} from "./styles/bottomTabBar.css";

export interface BottomTabItem {
  value: string;
  label: string;
  icon?: ReactNode;
  /** 알림 개수 배지 같은 표시. 개수는 라벨에도 담는다. */
  badge?: ReactNode;
}

/** 하단 탭은 5개를 넘기면 누르기 어려워진다. 타입으로 막는다. */
export type BottomTabItems =
  | [BottomTabItem]
  | [BottomTabItem, BottomTabItem]
  | [BottomTabItem, BottomTabItem, BottomTabItem]
  | [BottomTabItem, BottomTabItem, BottomTabItem, BottomTabItem]
  | [BottomTabItem, BottomTabItem, BottomTabItem, BottomTabItem, BottomTabItem];

export interface BottomTabBarProps {
  items: BottomTabItems;
  value: string;
  onChange: (value: string) => void;
  /** 화면 하단에 고정한다. */
  fixed?: boolean;
  /** 스크린 리더가 읽을 내비게이션 이름 */
  label?: string;
  className?: string;
}

export const BottomTabBar = ({
  items,
  value,
  onChange,
  fixed = false,
  label = "주요 메뉴",
  className,
}: BottomTabBarProps) => {
  return (
    <nav
      aria-label={label}
      className={`${barStyles({ fixed })} ${className || ""}`}
    >
      {items.map((item) => {
        const active = item.value === value;

        return (
          <button
            key={item.value}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => onChange(item.value)}
            className={tabStyles({ active })}
          >
            {item.icon}
            <span className={labelStyles}>{item.label}</span>
            {item.badge ? (
              <span className={badgeSlotStyles}>{item.badge}</span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
};

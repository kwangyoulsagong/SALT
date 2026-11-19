import { KeyboardEvent, ReactNode } from "react";
import { tabStyles } from "../style/tabs.css";

export interface TabProps {
  children: ReactNode;
  isActive?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  id?: string;
  panelId?: string;
  /** 모양 — 섹션 탭(기본) · 상세 알약 탭(`screen-desktop.md` §3) */
  variant?: "section" | "pill";
}

/**
 * 섹션 탭 한 칸 — 글자 14/600, 선택 = 1단 · 나머지 = 2단, 밑줄 없음(`FE-REQ-047` FR-4 · `screen-desktop.md` §3).
 * 전에는 제목 글자(`Heading` 3 · 18px)에 밑줄이 미끄러졌다(FE-REQ-044 P-31) — 선택은 진하기로만 가른다
 */
export const Tab = ({
  children,
  isActive = false,
  disabled = false,
  onClick,
  id,
  panelId,
  variant = "section",
}: TabProps) => {
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!disabled && onClick) {
        onClick();
      }
    }
  };

  return (
    <button
      id={id}
      role="tab"
      aria-selected={isActive}
      aria-controls={panelId}
      aria-disabled={disabled}
      tabIndex={isActive ? 0 : -1}
      className={tabStyles({ active: isActive, disabled, variant })}
      onClick={disabled ? undefined : onClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

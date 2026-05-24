import { KeyboardEvent, ReactNode } from "react";
import { Heading, HeadingProps } from "../../Typo/Heading/Heading.tsx";
import { tabStyles } from "../style/tabs.css.ts";

export interface TabProps {
  children: ReactNode;
  color?: HeadingProps["color"];
  isActive?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  id?: string;
  panelId?: string;
}

export const Tab = ({
  children,
  color,
  isActive = false,
  disabled = false,
  onClick,
  id,
  panelId,
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
      className={tabStyles({ active: isActive, disabled })}
      onClick={disabled ? undefined : onClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
    >
      <Heading level={3} color={color || (isActive ? "primary" : "tertiary")}>
        {children}
      </Heading>
    </button>
  );
};

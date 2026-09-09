"use client";

import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { IconButton } from "../IconButton/IconButton";
import {
  actionsStyles,
  appBarStyles,
  leadingSlotStyles,
  titleStyles,
} from "./styles/appBar.css";

export type AppBarLeading = "none" | "back" | "logo";

export interface AppBarProps {
  title?: ReactNode;
  leading?: AppBarLeading;
  /** `leading="back"`일 때 호출된다. 패키지 안에서 라우팅하지 않는다. */
  onBack?: () => void;
  /** `leading="logo"`일 때 왼쪽에 놓을 노드 */
  logo?: ReactNode;
  /** 오른쪽 액션 슬롯. 알림 아이콘 + `Badge` 조합을 여기에 넣는다. */
  actions?: ReactNode;
  sticky?: boolean;
  bordered?: boolean;
  className?: string;
}

export const AppBar = ({
  title,
  leading = "none",
  onBack,
  logo,
  actions,
  sticky = false,
  bordered = true,
  className,
}: AppBarProps) => {
  return (
    <header
      className={`${appBarStyles({ sticky, bordered })} ${className || ""}`}
    >
      {leading === "back" ? (
        <IconButton
          icon={<ChevronLeft size={22} aria-hidden="true" />}
          label="뒤로 가기"
          onClick={onBack}
        />
      ) : null}

      {leading === "logo" && logo ? (
        <span className={leadingSlotStyles}>{logo}</span>
      ) : null}

      {title ? <h1 className={titleStyles}>{title}</h1> : null}

      {actions ? <div className={actionsStyles}>{actions}</div> : null}
    </header>
  );
};

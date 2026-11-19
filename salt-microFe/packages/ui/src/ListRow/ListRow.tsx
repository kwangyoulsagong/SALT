"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import {
  bodyStyles,
  captionStyles,
  chevronStyles,
  deskCaption,
  deskPressable,
  deskRow,
  deskTitle,
  deskTrailing,
  deskTrailingBottom,
  leadingStyles,
  listRowStyles,
  titleStyles,
  trailingBottomStyles,
  trailingStyles,
} from "./styles/listRow.css";

export interface ListRowProps {
  title: ReactNode;
  caption?: ReactNode;
  /** 행 왼쪽 아이콘 슬롯. `AssetIcon`을 주로 넣는다. */
  leading?: ReactNode;
  /** 행 오른쪽 위 — 현재가·금액 */
  trailingTop?: ReactNode;
  /** 행 오른쪽 아래 — 등락률·보조 문구 */
  trailingBottom?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  divider?: boolean;
  /** 밀도 — `mobile`(기본, 56 · 본문 15) · `desk`(데스크톱 목록 행 44 · 13/600 · 금액 오른쪽 `tabular-nums`, `FE-REQ-060` FR-3) */
  density?: "mobile" | "desk";
  className?: string;
}

export const ListRow = ({
  title,
  caption,
  leading,
  trailingTop,
  trailingBottom,
  onPress,
  chevron = false,
  divider = false,
  density = "mobile",
  className,
}: ListRowProps) => {
  const pressable = Boolean(onPress);
  const desk = density === "desk";

  const content = (
    <>
      {leading ? <span className={leadingStyles}>{leading}</span> : null}

      <span className={bodyStyles}>
        <span className={desk ? `${titleStyles} ${deskTitle}` : titleStyles}>{title}</span>
        {caption ? <span className={desk ? `${captionStyles} ${deskCaption}` : captionStyles}>{caption}</span> : null}
      </span>

      {trailingTop || trailingBottom ? (
        <span className={desk ? `${trailingStyles} ${deskTrailing}` : trailingStyles}>
          {trailingTop}
          {trailingBottom ? (
            <span className={desk ? `${trailingBottomStyles} ${deskTrailingBottom}` : trailingBottomStyles}>{trailingBottom}</span>
          ) : null}
        </span>
      ) : null}

      {chevron ? (
        <ChevronRight className={chevronStyles} size={18} aria-hidden="true" />
      ) : null}
    </>
  );

  const rowClassName = [listRowStyles({ pressable, divider }), desk ? deskRow : "", desk && pressable ? deskPressable : "", className ?? ""]
    .filter(Boolean)
    .join(" ");

  if (pressable) {
    return (
      <button type="button" className={rowClassName} onClick={onPress}>
        {content}
      </button>
    );
  }

  return <div className={rowClassName}>{content}</div>;
};

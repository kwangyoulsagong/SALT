"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import {
  bodyStyles,
  captionStyles,
  chevronStyles,
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
  className,
}: ListRowProps) => {
  const pressable = Boolean(onPress);

  const content = (
    <>
      {leading ? <span className={leadingStyles}>{leading}</span> : null}

      <span className={bodyStyles}>
        <span className={titleStyles}>{title}</span>
        {caption ? <span className={captionStyles}>{caption}</span> : null}
      </span>

      {trailingTop || trailingBottom ? (
        <span className={trailingStyles}>
          {trailingTop}
          {trailingBottom ? (
            <span className={trailingBottomStyles}>{trailingBottom}</span>
          ) : null}
        </span>
      ) : null}

      {chevron ? (
        <ChevronRight className={chevronStyles} size={18} aria-hidden="true" />
      ) : null}
    </>
  );

  const rowClassName = `${listRowStyles({ pressable, divider })} ${
    className || ""
  }`;

  if (pressable) {
    return (
      <button type="button" className={rowClassName} onClick={onPress}>
        {content}
      </button>
    );
  }

  return <div className={rowClassName}>{content}</div>;
};

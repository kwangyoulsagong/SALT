import type { ReactNode } from "react";
import { listStyles, titleStyles, wrapperStyles } from "./styles/bottomInfo.css";

export interface BottomInfoProps {
  /** 화면 맨 아래에 놓는 안내 문구들 */
  items: ReactNode[];
  title?: string;
  className?: string;
}

/**
 * 화면 맨 아래 작은 안내·면책 문구 묶음.
 * 사용자가 지금 읽어야 하는 경고는 `Banner`를 쓴다.
 */
export const BottomInfo = ({
  items,
  title = "안내",
  className,
}: BottomInfoProps) => {
  return (
    <aside className={`${wrapperStyles} ${className || ""}`}>
      <p className={titleStyles}>{title}</p>
      <ul className={listStyles}>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </aside>
  );
};

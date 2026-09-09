import type { ReactNode } from "react";
import { captionStyles, footerStyles } from "./styles/listFooter.css";

export interface ListFooterProps {
  /** 가운데 놓을 행동. `TextButton`을 주로 넣는다. */
  children?: ReactNode;
  /** 행동 대신 또는 함께 보여줄 설명. 예: 남은 개수 */
  caption?: ReactNode;
  className?: string;
}

/** `ListGroup` 마지막 줄. "더 보기"나 남은 개수를 놓는다. */
export const ListFooter = ({
  children,
  caption,
  className,
}: ListFooterProps) => {
  return (
    <div className={`${footerStyles} ${className || ""}`}>
      {caption ? <span className={captionStyles}>{caption}</span> : null}
      {children}
    </div>
  );
};

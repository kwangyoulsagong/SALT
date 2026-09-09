"use client";

import type { ReactNode } from "react";
import { Heart, MessageSquare } from "lucide-react";
import {
  excerptStyles,
  headStyles,
  metaItemStyles,
  metaStyles,
  rowStyles,
  titleStyles,
} from "./styles/boardRow.css";

export interface BoardRowProps {
  title: ReactNode;
  /** 본문 미리보기. 두 줄까지 보여준다. */
  excerpt?: ReactNode;
  author?: ReactNode;
  time?: ReactNode;
  commentCount?: number;
  likeCount?: number;
  /** 제목 왼쪽 배지 슬롯 */
  badge?: ReactNode;
  onPress?: () => void;
  divider?: boolean;
  className?: string;
}

/** 커뮤니티·피드의 글 한 줄. 시세 목록은 `ListRow`를 쓴다. */
export const BoardRow = ({
  title,
  excerpt,
  author,
  time,
  commentCount,
  likeCount,
  badge,
  onPress,
  divider = true,
  className,
}: BoardRowProps) => {
  const pressable = Boolean(onPress);

  const content = (
    <>
      <span className={headStyles}>
        {badge}
        <span className={titleStyles}>{title}</span>
      </span>

      {excerpt ? <span className={excerptStyles}>{excerpt}</span> : null}

      <span className={metaStyles}>
        {author ? <span>{author}</span> : null}
        {time ? <span>{time}</span> : null}
        {commentCount !== undefined ? (
          <span className={metaItemStyles}>
            <MessageSquare size={12} aria-hidden="true" />
            댓글 {commentCount.toLocaleString("ko-KR")}
          </span>
        ) : null}
        {likeCount !== undefined ? (
          <span className={metaItemStyles}>
            <Heart size={12} aria-hidden="true" />
            좋아요 {likeCount.toLocaleString("ko-KR")}
          </span>
        ) : null}
      </span>
    </>
  );

  const rowClassName = `${rowStyles({ pressable, divider })} ${className || ""}`;

  if (pressable) {
    return (
      <button type="button" className={rowClassName} onClick={onPress}>
        {content}
      </button>
    );
  }

  return <article className={rowClassName}>{content}</article>;
};

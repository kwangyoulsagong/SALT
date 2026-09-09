import type { ReactNode } from "react";
import { highlightStyles } from "./styles/highlight.css";

export type HighlightTone = "brand" | "ai" | "up" | "down" | "neutral";

export interface HighlightProps {
  children: ReactNode;
  tone?: HighlightTone;
  className?: string;
}

/**
 * 문장 안에서 한 조각을 강조한다. 검색어 일치, 근거 문장의 핵심 수치 등.
 * `mark`라서 스크린 리더가 강조로 읽는다.
 */
export const Highlight = ({
  children,
  tone = "brand",
  className,
}: HighlightProps) => {
  return (
    <mark className={`${highlightStyles({ tone })} ${className || ""}`}>
      {children}
    </mark>
  );
};

import { ReactNode } from "react";
import { headingStyles } from "./styles/heading.css";

export interface HeadingProps {
  children: ReactNode;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  /**
   * 문서 구조상 태그(`h1`~`h6`). 없으면 `level` 과 같다. **모양은 `level` 이 정한다** — 같은 크기로 보여야 하지만
   * 놓이는 자리의 제목 단계가 다를 때(예: 카드 제목 h2 아래라 h3 여야 하는 판단 라벨) 쓴다. 단계를 건너뛰면
   * 스크린리더 제목 탐색이 끊긴다(axe `heading-order`)
   */
  as?: 1 | 2 | 3 | 4 | 5 | 6;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  color?: "primary" | "secondary" | "tertiary" | "brand" | "white";
  lineClamp?: 1 | 2 | 3;
}

export const Heading = ({
  children,
  level,
  as,
  size,
  color,
  lineClamp,
}: HeadingProps) => {
  const Tag = `h${as ?? level}` as const;

  return (
    <Tag className={headingStyles({ level, size, color, lineClamp })}>
      {children}
    </Tag>
  );
};

import type { ReactNode } from "react";
import {
  actionStyles,
  descriptionStyles,
  emptyStateStyles,
  iconStyles,
  titleStyles,
} from "./styles/emptyState.css";

/** 빈 목록뿐 아니라 저장 성공·실패 결과 화면에도 쓴다. */
export type EmptyStateTone = "empty" | "success" | "error";

export interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  tone?: EmptyStateTone;
  className?: string;
}

/**
 * 화면 단위 빈 상태·결과 표시.
 * 표 안의 "데이터가 없습니다" 행은 `@repo/ui/table`의 `EmptyState`를 쓴다.
 */
export const EmptyState = ({
  title,
  description,
  icon,
  action,
  tone = "empty",
  className,
}: EmptyStateProps) => {
  return (
    <div className={`${emptyStateStyles} ${className || ""}`}>
      {icon ? (
        <span className={iconStyles({ tone })} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <p className={titleStyles}>{title}</p>
      {description ? <p className={descriptionStyles}>{description}</p> : null}
      {action ? <div className={actionStyles}>{action}</div> : null}
    </div>
  );
};

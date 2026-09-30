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
  /**
   * `badge`(기본) — 아이콘을 48px 톤 원 안에 둔다.
   * `none` — `StatusGraphic` · `Illustration` 처럼 스스로 면을 가진 그래픽을 원 없이 그대로 둔다(FE-REQ-044 FR-12).
   */
  iconFrame?: "badge" | "none";
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
  iconFrame = "badge",
  className,
}: EmptyStateProps) => {
  return (
    <div className={`${emptyStateStyles} ${className || ""}`}>
      {icon ? (
        <span className={iconStyles({ tone, frame: iconFrame })} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <p className={titleStyles}>{title}</p>
      {description ? <p className={descriptionStyles}>{description}</p> : null}
      {action ? <div className={actionStyles}>{action}</div> : null}
    </div>
  );
};

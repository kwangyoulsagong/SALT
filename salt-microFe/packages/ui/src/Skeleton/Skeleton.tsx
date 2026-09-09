import { linesStyles, skeletonStyles } from "./styles/skeleton.css";

export type SkeletonRadius = "none" | "small" | "base" | "medium" | "full";

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: SkeletonRadius;
  /** 2 이상이면 그만큼 줄을 쌓는다. 마지막 줄은 60% 폭으로 짧아진다. */
  lines?: number;
  className?: string;
}

export const Skeleton = ({
  width = "100%",
  height = 16,
  radius = "small",
  lines = 1,
  className,
}: SkeletonProps) => {
  const blockClassName = `${skeletonStyles({ radius })} ${className || ""}`;

  if (lines > 1) {
    return (
      <div className={linesStyles} aria-hidden="true">
        {Array.from({ length: lines }, (_, index) => (
          <span
            key={index}
            className={blockClassName}
            style={{
              width: index === lines - 1 ? "60%" : width,
              height,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={blockClassName}
      style={{ width, height }}
    />
  );
};

import { spinnerStyles } from "./styles/spinner.css";

export type SpinnerSize = "sm" | "md" | "lg";
export type SpinnerTone = "brand" | "neutral" | "white";

export interface SpinnerProps {
  size?: SpinnerSize;
  tone?: SpinnerTone;
  /** 스크린 리더가 읽을 문구. 화면 전체 로딩에는 반드시 넘긴다. */
  label?: string;
  className?: string;
}

/**
 * 진행 중임을 알리는 회전 표시.
 * 자리를 미리 잡아야 하는 목록·카드 로딩은 `Skeleton`을 쓴다.
 */
export const Spinner = ({
  size = "md",
  tone = "brand",
  label,
  className,
}: SpinnerProps) => {
  return (
    <span
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`${spinnerStyles({ size, tone })} ${className || ""}`}
    />
  );
};

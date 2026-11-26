import { fillStyles, trackStyles } from "./styles/progressBar.css";

export type ProgressTone =
  | "brand"
  | "up"
  | "down"
  | "success"
  | "warning"
  | "neutral"
  | "ai";

export interface ProgressSegment {
  /** 0~1. 전체 세그먼트 합이 1을 넘으면 넘친 만큼 잘린다. */
  value: number;
  tone?: ProgressTone;
  /** 스크린 리더가 읽을 세그먼트 이름 */
  label?: string;
}

export interface ProgressBarProps {
  /** 0~1. `segments`를 주면 무시된다. */
  value?: number;
  tone?: ProgressTone;
  /** 자산군 비중처럼 여러 색으로 나뉜 막대를 만든다. */
  segments?: ProgressSegment[];
  height?: number;
  /** 막대가 무엇의 진행률인지. 스크린 리더용이라 항상 넣는다. */
  label: string;
  className?: string;
}

const clamp = (value: number) => Math.min(1, Math.max(0, value));

/** 채움은 트랙 폭 그대로 — 시작 위치는 `translateX`(자기 폭 = 트랙 폭 기준 %), 길이는 `scaleX`(FE-REQ-062 FR-6) */
const toTransform = (start: number, value: number) => {
  const from = clamp(start);
  const length = Math.min(clamp(value), 1 - from);
  return `translateX(${(from * 100).toFixed(2)}%) scaleX(${length.toFixed(4)})`;
};

export const ProgressBar = ({
  value = 0,
  tone = "brand",
  segments,
  height = 8,
  label,
  className,
}: ProgressBarProps) => {
  if (segments && segments.length > 0) {
    const description = segments
      .map(
        (segment) =>
          `${segment.label || "구간"} ${Math.round(clamp(segment.value) * 100)}%`
      )
      .join(", ");

    return (
      <div
        role="img"
        aria-label={`${label}: ${description}`}
        className={`${trackStyles} ${className || ""}`}
        style={{ height }}
      >
        {segments.map((segment, index) => {
          const start = segments.slice(0, index).reduce((sum, previous) => sum + clamp(previous.value), 0);
          return (
            <div
              key={index}
              className={fillStyles({ tone: segment.tone || "brand" })}
              style={{ transform: toTransform(start, segment.value) }}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamp(value) * 100)}
      className={`${trackStyles} ${className || ""}`}
      style={{ height }}
    >
      <div className={fillStyles({ tone })} style={{ transform: toTransform(0, value) }} />
    </div>
  );
};

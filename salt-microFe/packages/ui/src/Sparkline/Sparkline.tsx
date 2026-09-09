import { sparklineStyles } from "./styles/sparkline.css";

export type SparklineTone = "auto" | "up" | "down" | "neutral" | "brand";

export interface SparklineProps {
  /** 시간순 값. 2개 미만이면 아무것도 그리지 않는다. */
  points: number[];
  tone?: SparklineTone;
  width?: number;
  height?: number;
  strokeWidth?: number;
  /** 스크린 리더가 읽을 이름. 추세는 이 문구에도 담는다. */
  label: string;
  className?: string;
}

/**
 * 지수 칩용 소형 추세선.
 * 축·툴팁·캔들이 필요한 큰 차트는 `PreviewChart`를 쓴다.
 */
export const Sparkline = ({
  points,
  tone = "auto",
  width = 64,
  height = 24,
  strokeWidth = 1.5,
  label,
  className,
}: SparklineProps) => {
  const first = points[0];
  const last = points[points.length - 1];

  const resolvedTone =
    tone === "auto"
      ? first === undefined || last === undefined || last === first
        ? "neutral"
        : last > first
          ? "up"
          : "down"
      : tone;

  if (points.length < 2) {
    return null;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min;

  // 내부 여백을 선 두께의 절반씩 둬야 위아래 끝이 잘리지 않는다.
  const inset = strokeWidth / 2;
  const drawableHeight = height - strokeWidth;

  const path = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const ratio = span === 0 ? 0.5 : (point - min) / span;
      const y = height - inset - ratio * drawableHeight;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      role="img"
      aria-label={label}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`${sparklineStyles({ tone: resolvedTone })} ${
        className || ""
      }`}
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

import { useId } from "react";

import { baselineStyle, sparklineStyles } from "./styles/sparkline.css";

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
  /** 선 아래를 선 색으로 옅게 칠한다(위에서 아래로 사라지는 그라데이션). */
  area?: boolean;
  /**
   * 점선 기준선을 그릴 값(예: 구간 시작 값). 범위 밖이면 범위를 넓혀 선이 보이게 한다.
   * 무엇의 기준인지는 부르는 쪽이 `label` 에 담는다.
   */
  baseline?: number;
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
  area = false,
  baseline,
  className,
}: SparklineProps) => {
  // 한 화면에 여러 개가 있어도 그라데이션 id 가 겹치지 않게 한다
  const gradientId = useId();
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

  const scaled = baseline === undefined ? points : [...points, baseline];
  const min = Math.min(...scaled);
  const max = Math.max(...scaled);
  const span = max - min;

  // 내부 여백을 선 두께의 절반씩 둬야 위아래 끝이 잘리지 않는다.
  const inset = strokeWidth / 2;
  const drawableHeight = height - strokeWidth;

  const yOf = (value: number) => {
    const ratio = span === 0 ? 0.5 : (value - min) / span;
    return height - inset - ratio * drawableHeight;
  };

  const path = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${yOf(point).toFixed(2)}`;
    })
    .join(" ");
  const areaPath = `${path} L${width} ${height} L0 ${height} Z`;
  const baselineY = baseline === undefined ? undefined : yOf(baseline).toFixed(2);

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
      {area ? (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity={0.22} />
              <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
        </>
      ) : null}
      {baselineY === undefined ? null : (
        <line
          x1={0}
          x2={width}
          y1={baselineY}
          y2={baselineY}
          className={baselineStyle}
        />
      )}
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

import { formatPrice } from "@repo/web-shared/lib";

import { range, rangeDot, rangeEnds, rangeTrack, statLabel } from "./DetailHead.css";

/**
 * 저가~고가 사이에서 현재가가 앉는 위치(%). 폭이 0 이면(고가 = 저가) 가운데 — 0 으로 나누지 않는다. 금액이 아니라 표시 기하다
 */
export const rangePosition = (low: number, high: number, current: number): number => {
  const span = high - low;
  if (span <= 0) return 50;
  return Math.min(Math.max((current - low) / span, 0), 1) * 100;
};

interface RangeBarProps {
  /** "1일" · "52주" */
  label: string;
  low: number;
  high: number;
  current: number;
  /** 스크린리더 한 줄 — 막대는 그림이라 숨긴다 */
  srText: string;
}

/** 범위 막대(`FE-REQ-049` FR-1) — 서버 컴포넌트에서도 쓴다(상태 · 효과 없음) */
export const RangeBar = ({ label, low, high, current, srText }: RangeBarProps) => (
  <div className={range} role="group" aria-label={srText}>
    <span className={statLabel} aria-hidden="true">
      {label}
    </span>
    <div className={rangeTrack} aria-hidden="true">
      <span className={rangeDot} style={{ left: `${rangePosition(low, high, current)}%` }} />
    </div>
    <span className={rangeEnds} aria-hidden="true">
      <span>{formatPrice(low)}</span>
      <span>{formatPrice(high)}</span>
    </span>
  </div>
);

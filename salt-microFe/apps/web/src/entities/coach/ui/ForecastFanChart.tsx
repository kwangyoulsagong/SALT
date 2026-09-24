"use client";

import { type CSSProperties, useRef } from "react";

import type { ForecastHistoryPoint, ForecastHorizonView } from "@repo/core/coach";

import { useElementWidth } from "@/shared/lib";

import { FORECAST_MESSAGES as M } from "../model";
import * as s from "./ForecastFanChart.css";

type Shown = Extract<ForecastHorizonView, { renderable: true }>;

const HEIGHT = 212;
const PAD = { top: 30, right: 12, bottom: 26, left: 4 };
const DAYS_PER_WEEK = 7;
/** 과거 : 미래 폭. 날짜 비례로 두면 8주 과거 옆에서 2주 범위가 손톱만 해진다 */
const HISTORY_SHARE = 0.58;
/** 첫 하이라이트는 선 · 범위가 다 그려진 뒤 — 그 뒤 바뀔 때는 바로 */
const INTRO_MS = 1400;

interface ForecastFanChartProps {
  history: ForecastHistoryPoint[];
  shown: Shown[];
  /** 실시간 현재가 — 아직 안 왔으면 `null`. 선 끝("지금")에 점으로 뜬다 */
  livePrice: number | null;
  /** 하이라이트할 기간의 `shown` 인덱스 */
  active: number;
}

/**
 * 가격 변동 범위 차트 — 과거 가격 선 + "지금"에서 퍼지는 범위 (F008 `FE-REQ-038` FR-9).
 *
 * 숫자는 전부 서버 값이다. 여기서 하는 계산은 **그리기 좌표**뿐이다.
 *
 * - x: 과거(일봉)와 미래(기준일 + 7·주)가 폭을 58 : 42 로 나눈다 — 두 구간의 하루 폭이 다르다
 * - 바깥 영역 90% · 안쪽 50% · 점선 중앙값. 기간 사이는 직선으로 잇는다(주 단위 값만 있다)
 * - 그려지는 순서: 선 → 범위가 "지금"에서 오른쪽으로 펼쳐짐 → 기간 하이라이트
 *
 * 스크린리더는 이 그림 대신 카드의 가격 표를 읽는다(`aria-hidden`, `a11y-policy.md`).
 */
export const ForecastFanChart = ({ history, shown, livePrice, active }: ForecastFanChartProps) => {
  const [ref, width] = useElementWidth<HTMLDivElement>(320);
  const mountedAt = useRef<number | null>(null);
  if (mountedAt.current === null) mountedAt.current = Date.now();
  const base = shown[0];
  if (!base) return <div ref={ref} />;

  // 기준 시각(`asOf`)은 기준 일봉이 **닫힌 시각**이다 — 09-22 봉의 asOf 는 09-23 00:00Z 다.
  // 날짜가 같은 봉을 찾으면 늘 하루 어긋난다. asOf 보다 먼저 시작한 마지막 봉이 기준 봉이다
  const asOfMs = Date.parse(base.asOf);
  const baseIndex = Math.max(0, history.findLastIndex((p) => Date.parse(p.date) < asOfMs));
  const lastIndex = history.length - 1;
  const futureDays = (shown[shown.length - 1]?.horizonWeeks ?? 1) * DAYS_PER_WEEK;

  const values = [
    ...history.map((p) => p.close),
    ...shown.flatMap((h) => [h.range.low, h.range.high]),
    base.basePrice,
    ...(livePrice === null ? [] : [livePrice]),
  ];
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = (hi - lo) * 0.06 || hi * 0.01;
  const min = lo - pad;
  const max = hi + pad;

  const innerW = width - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const splitX = PAD.left + innerW * HISTORY_SHARE;
  const x = (day: number) =>
    day <= baseIndex
      ? PAD.left + (baseIndex === 0 ? innerW * HISTORY_SHARE : (day / baseIndex) * innerW * HISTORY_SHARE)
      : splitX + ((day - baseIndex) / futureDays) * (innerW - innerW * HISTORY_SHARE);
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * innerH;
  const pt = (day: number, v: number) => `${x(day).toFixed(1)},${y(v).toFixed(1)}`;

  // 선과 영역은 마지막 일봉에서 끝난다. 실시간 점은 같은 x("지금")에 떠서 어제 종가와 점선으로 잇는다 —
  // 하루를 더 그리면 영역이 "지금" 오른쪽으로 삐져나와 범위를 가린다
  const line = history.map((p, i) => pt(i, p.close));
  const lastClose = history[lastIndex]?.close;
  const linePath = line.length > 1 ? `M${line.join("L")}` : "";
  const areaPath = linePath && `${linePath}L${x(line.length - 1).toFixed(1)},${HEIGHT - PAD.bottom}L${x(0)},${HEIGHT - PAD.bottom}Z`;

  const first = history[0]?.close ?? base.basePrice;
  const now = livePrice ?? history[lastIndex]?.close ?? base.basePrice;
  const trend = now > first ? s.tone.up : now < first ? s.tone.down : s.tone.flat;

  const bx = baseIndex;
  const hx = (h: Shown) => bx + h.horizonWeeks * DAYS_PER_WEEK;
  const band = (upper: (h: Shown) => number, lower: (h: Shown) => number) =>
    `M${pt(bx, base.basePrice)}L${shown.map((h) => pt(hx(h), upper(h))).join("L")}L${[...shown]
      .reverse()
      .map((h) => pt(hx(h), lower(h)))
      .join("L")}Z`;
  const fan90 = band((h) => h.range.high, (h) => h.range.low);
  const fan50 = band((h) => h.range.upperQuartile, (h) => h.range.lowerQuartile);
  const medianPath = `M${pt(bx, base.basePrice)}L${shown.map((h) => pt(hx(h), h.range.median)).join("L")}`;

  const current = shown[active] ?? base;
  const fromDay = active > 0 && shown[active - 1] ? hx(shown[active - 1] as Shown) : bx;
  const toDay = hx(current);
  const chipW = 52;
  const chipX = Math.min(Math.max(x(toDay) - chipW / 2, PAD.left), width - PAD.right - chipW);
  const introLeft = Math.max(0, INTRO_MS - (Date.now() - (mountedAt.current ?? 0)));

  return (
    <div ref={ref} className={s.frame} aria-hidden="true">
      <svg className={`${s.svg} ${trend}`} width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`}>
        <defs>
          <linearGradient id="forecast-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity={0.16} />
            <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* 기간 눈금 — "지금"과 각 주 */}
        <line className={s.nowRule} x1={x(bx)} x2={x(bx)} y1={PAD.top - 6} y2={HEIGHT - PAD.bottom} />
        <text className={s.axisLabel} x={x(bx)} y={HEIGHT - 8} textAnchor="middle">
          {M.now}
        </text>
        {shown.map((h) => (
          <g key={h.horizonWeeks}>
            <line className={s.weekRule} x1={x(hx(h))} x2={x(hx(h))} y1={PAD.top} y2={HEIGHT - PAD.bottom} />
            <text className={s.axisLabel} x={x(hx(h))} y={HEIGHT - 8} textAnchor="middle">
              {M.weekTick(h.horizonWeeks)}
            </text>
          </g>
        ))}

        {/* 과거 가격 — 영역은 선을 따라 늦게 나타난다 */}
        {areaPath && <path className={s.area} d={areaPath} fill="url(#forecast-area)" />}
        {linePath && <path className={s.line} d={linePath} pathLength={1} />}

        {/* 범위 — "지금"에서 오른쪽으로 펼쳐진다 */}
        <g className={s.fan}>
          <path className={s.fan90} d={fan90} />
          <path className={s.fan50} d={fan50} />
          <path className={s.median} d={medianPath} />
        </g>

        {/* 기간 하이라이트 — 바뀔 때마다 새로 마운트돼 다시 그려진다 */}
        <g key={current.horizonWeeks} className={s.highlight} style={{ [s.INTRO_PROPERTY]: `${introLeft}ms` } as CSSProperties}>
          <rect
            className={s.column}
            x={x(fromDay)}
            y={PAD.top - 2}
            width={Math.max(0, x(toDay) - x(fromDay))}
            height={innerH + 2}
            rx={6}
          />
          <line className={s.guide} x1={x(toDay)} x2={x(toDay)} y1={y(current.range.high)} y2={y(current.range.low)} />
          <circle className={s.dotEdge} cx={x(toDay)} cy={y(current.range.high)} r={3.5} />
          <circle className={s.dotMedian} cx={x(toDay)} cy={y(current.range.median)} r={4} />
          <circle className={s.dotEdge} cx={x(toDay)} cy={y(current.range.low)} r={3.5} />
          <g className={s.chip}>
            <rect x={chipX} y={4} width={chipW} height={20} rx={10} className={s.chipBox} />
            <text x={chipX + chipW / 2} y={18} textAnchor="middle" className={s.chipText}>
              {M.horizon(current.horizonWeeks)}
            </text>
          </g>
        </g>

        {/* 실시간 점 — 값이 오면 선 끝에서 숨 쉰다 */}
        {livePrice !== null && lastClose !== undefined && (
          <>
            <line
              className={s.liveLink}
              x1={x(lastIndex)}
              x2={x(lastIndex)}
              y1={y(lastClose)}
              y2={y(livePrice)}
            />
            <g className={s.liveMark} style={{ transform: `translate(${x(lastIndex).toFixed(1)}px, ${y(livePrice).toFixed(1)}px)` }}>
              <circle className={s.pulse} r={4} />
              <circle className={s.liveDot} r={4} />
            </g>
          </>
        )}
      </svg>
    </div>
  );
};

"use client";

import {
  type KeyboardEvent,
  memo,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Minus, Plus, RotateCcw } from "lucide-react";

import { type BaseFrame, drawBase } from "./engine/drawBase";
import { type Crosshair, drawOverlay } from "./engine/drawOverlay";
import { formatCompact, formatPrice, formatSignedPercent } from "./engine/format";
import { computeLayout } from "./engine/layout";
import { buildSeries, type ChartSeries, extremaIndices, VOLUME_AVERAGE_PERIOD } from "./engine/series";
import { movingAverageColor } from "./engine/theme";
import { formatFullTime } from "./engine/time";
import {
  clampViewport,
  defaultViewport,
  followAppend,
  indexToX,
  panBy,
  type Viewport,
  xToIndex,
  zoomAt,
} from "./engine/viewport";
import { TRADING_CHART_MESSAGES, type TradingChartMessages } from "./messages";
import * as styles from "./TradingChart.css";
import type { TradingCandle, TradingPriceBand, TradingPriceLine } from "./types";

export type { TradingCandle, TradingPriceBand, TradingPriceLine } from "./types";
export { TRADING_CHART_MESSAGES, type TradingChartMessages } from "./messages";

const DEFAULT_AVERAGES: readonly number[] = [5, 20, 60, 120];
const NO_LINES: readonly TradingPriceLine[] = [];
/** 한국 시간. 서버 봉 시각이 KST 다 — 앱이 다른 시장을 그리면 바꿔 넘긴다 */
const KST_OFFSET_MINUTES = 540;
const ZOOM_STEP = 1.25;
const CONTROL_ICON_SIZE = 15;
/** 휠 한 칸(deltaY 100) ≈ 16% 확대 */
const WHEEL_ZOOM_SENSITIVITY = 0.0015;
/** 이만큼 움직여야 탭이 아니라 드래그다 */
const DRAG_THRESHOLD_PX = 4;
const KEY_PAGE_STEP = 10;

export interface TradingChartProps {
  /** 오래된 것부터. 시각은 UTC epoch ms */
  candles: readonly TradingCandle[];
  /** 차트 전체 높이(px, 범례 제외). 자리표시자도 같은 높이를 잡는다 */
  height: number;
  /** 분봉이면 true — 시간축 · 배지가 시:분 */
  intraday: boolean;
  /** 스크린리더 이름(종목 · 기간) */
  name: string;
  priceLines?: readonly TradingPriceLine[];
  /** 옅게 칠할 가격 구간 하나 + 이름표. 경계선은 `priceLines` 로 따로 넘긴다 */
  priceBand?: TradingPriceBand | null;
  movingAveragePeriods?: readonly number[];
  timeZoneOffsetMinutes?: number;
  /** 바뀌면 뷰포트 · 십자선을 기본으로 되돌린다(기간 전환, FR-27) */
  resetKey?: string | number;
  /** 범례 첫 줄 오른쪽에 붙는 것(실시간 아님 · 불러오는 중) */
  legendAside?: ReactNode;
  messages?: TradingChartMessages;
}

interface DragState {
  pointerId: number;
  lastX: number;
  travelled: number;
  touch: boolean;
}

/** 새 데이터가 이전 데이터 뒤에 몇 개 붙고 앞에서 몇 개 빠졌나. 모르면 null(통째 교체) */
const diffAppend = (prev: ChartSeries, next: ChartSeries) => {
  if (prev.length === 0 || next.length === 0) return null;
  const lastTime = prev.time[prev.length - 1]!;
  // 대개 끝에서 1~2칸 안에 있다 — 뒤에서부터 찾는다
  for (let i = next.length - 1; i >= 0; i -= 1) {
    if (next.time[i]! === lastTime) {
      const added = next.length - 1 - i;
      return { added, dropped: prev.length + added - next.length };
    }
    if (next.time[i]! < lastTime) break;
  }
  return null;
};

/**
 * 트레이딩 차트 (`FE-REQ-034`) — 외부 차트 라이브러리 없이 캔버스 두 장으로 그린다.
 *
 * ## React 는 그리지 않는다
 *
 * 데이터 · 크기 · 뷰포트가 바뀌면 `requestAnimationFrame` 한 번에 모아 **기본 캔버스**를 그리고,
 * 포인터가 움직이면 **오버레이(십자선)만** 다시 그린다. 포인터 · 휠 · 드래그 · 뷰포트는 ref 에 있고
 * React 상태는 범례가 보여줄 봉 번호와 이동평균 표시 여부뿐이다.
 *
 * ## 접근성
 *
 * 캔버스는 `aria-hidden` 이다. 범례(가리킨 봉 값) · 버튼 · 요약 문장은 DOM 이고, 차트 영역은 포커스를
 * 받아 키보드로 봉을 옮긴다. 가리킨 봉이 바뀌어도 낭독하지 않는다(`aria-live` 없음).
 */
export const TradingChart = memo(
  ({
    candles,
    height,
    intraday,
    name,
    priceLines = NO_LINES,
    priceBand = null,
    movingAveragePeriods = DEFAULT_AVERAGES,
    timeZoneOffsetMinutes = KST_OFFSET_MINUTES,
    resetKey,
    legendAside,
    messages = TRADING_CHART_MESSAGES,
  }: TradingChartProps) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const plotRef = useRef<HTMLDivElement>(null);
    const baseRef = useRef<HTMLCanvasElement>(null);
    const overlayRef = useRef<HTMLCanvasElement>(null);

    const series = useMemo(
      () => buildSeries(candles, movingAveragePeriods),
      [candles, movingAveragePeriods],
    );
    const [hidden, setHidden] = useState<ReadonlySet<number>>(() => new Set());
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);

    // ── 그리기 상태 (ref — 렌더를 일으키지 않는다)
    const widthRef = useRef(0);
    const vpRef = useRef<Viewport>(defaultViewport());
    const crosshairRef = useRef<Crosshair | null>(null);
    const pinnedRef = useRef(false);
    const frameRef = useRef<BaseFrame | null>(null);
    const dragRef = useRef<DragState | null>(null);
    const seriesRef = useRef(series);
    const drawInputsRef = useRef({ priceLines, priceBand, hidden, intraday, timeZoneOffsetMinutes, messages });
    drawInputsRef.current = { priceLines, priceBand, hidden, intraday, timeZoneOffsetMinutes, messages };
    const pendingRef = useRef({ base: false, overlay: false, raf: 0 });
    const baseDrawsRef = useRef(0);
    /**
     * 차트 영역의 화면 좌표 캐시. 포인터마다 `getBoundingClientRect` 를 부르면, 직전 이벤트의 범례
     * 갱신으로 더러워진 DOM 때문에 **강제 레이아웃**이 난다(프로덕션 실측 0.32ms/이동). 크기 · 스크롤 ·
     * 진입 때만 버린다
     */
    const rectRef = useRef<DOMRect | null>(null);
    const legendIndexRef = useRef<number | null>(null);

    const layout = useMemo(() => computeLayout(0, height), [height]);

    const flush = useCallback(() => {
      const pending = pendingRef.current;
      pending.raf = 0;
      const width = widthRef.current;
      const base = baseRef.current?.getContext("2d");
      const overlay = overlayRef.current?.getContext("2d");
      if (!base || !overlay || width <= 0) return;
      const currentLayout = computeLayout(width, height);
      const inputs = drawInputsRef.current;
      const s = seriesRef.current;
      if (pending.base || !frameRef.current) {
        pending.base = false;
        const visibleAverages = s.movingAverages
          .map((ma, order) => (inputs.hidden.has(ma.period) ? -1 : order))
          .filter((order) => order >= 0);
        frameRef.current = drawBase(base, currentLayout, s, vpRef.current, {
          priceLines: inputs.priceLines,
          priceBand: inputs.priceBand,
          visibleAverages,
          intraday: inputs.intraday,
          offsetMinutes: inputs.timeZoneOffsetMinutes,
          timeLabels: inputs.messages.timeTicks,
        });
        baseDrawsRef.current += 1;
        // 측정용 — 십자선 이동이 기본 캔버스를 다시 그리지 않는지 밖에서 센다(REQ 수용 기준)
        if (rootRef.current) rootRef.current.dataset.baseDraws = String(baseDrawsRef.current);
      }
      pending.overlay = false;
      // 범례는 프레임당 한 번만 — 이벤트마다 React 커밋을 만들지 않는다
      const hovered = crosshairRef.current?.index ?? null;
      if (hovered !== legendIndexRef.current) {
        legendIndexRef.current = hovered;
        setHoverIndex(hovered);
      }
      drawOverlay(
        overlay,
        currentLayout,
        s,
        vpRef.current,
        frameRef.current,
        crosshairRef.current,
        inputs.intraday,
        inputs.timeZoneOffsetMinutes,
      );
    }, [height]);

    const schedule = useCallback(
      (redrawBase: boolean) => {
        const pending = pendingRef.current;
        pending.base = pending.base || redrawBase;
        pending.overlay = true;
        if (!pending.raf) pending.raf = requestAnimationFrame(flush);
      },
      [flush],
    );

    const setCrosshair = useCallback(
      (next: Crosshair | null) => {
        crosshairRef.current = next;
        schedule(false);
      },
      [schedule],
    );

    // ── 크기: CSS 크기와 backing store 를 나누고 DPR 을 반영한다(`canvas.md`)
    useLayoutEffect(() => {
      const plot = plotRef.current;
      if (!plot) return undefined;
      const resize = (width: number) => {
        const w = Math.floor(width);
        rectRef.current = null;
        if (w === widthRef.current) return;
        widthRef.current = w;
        const dpr = window.devicePixelRatio || 1;
        for (const canvas of [baseRef.current, overlayRef.current]) {
          if (!canvas) continue;
          canvas.width = Math.round(w * dpr);
          canvas.height = Math.round(height * dpr);
          canvas.style.width = `${w}px`;
          canvas.style.height = `${height}px`;
          canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        vpRef.current = clampViewport(vpRef.current, seriesRef.current.length, computeLayout(w, height).plotWidth);
        schedule(true);
      };
      // 높이가 바뀌어 다시 들어온 경우 — 폭이 같아도 backing store 를 다시 잡는다
      widthRef.current = -1;
      resize(plot.clientWidth);
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) resize(entry.contentRect.width);
      });
      observer.observe(plot);
      return () => observer.disconnect();
    }, [height, schedule]);

    // ── 데이터: 끝에 붙은 봉이면 뷰포트를 이어가고, 아니면 그대로 다시 그린다(FR-26)
    useLayoutEffect(() => {
      const prev = seriesRef.current;
      seriesRef.current = series;
      if (prev === series) return;
      const diff = diffAppend(prev, series);
      const plotWidth = computeLayout(widthRef.current, height).plotWidth;
      if (diff) {
        vpRef.current = followAppend(vpRef.current, diff.added);
        const crosshair = crosshairRef.current;
        if (crosshair && diff.dropped > 0) {
          const index = crosshair.index - diff.dropped;
          crosshairRef.current = index >= 0 ? { ...crosshair, index } : null;
        }
      } else if (crosshairRef.current) {
        crosshairRef.current = null;
      }
      vpRef.current = clampViewport(vpRef.current, series.length, plotWidth);
      schedule(true);
    }, [series, height, schedule]);

    // 기간 전환 — 기본 보기로(FR-27)
    const firstResetRef = useRef(true);
    useEffect(() => {
      if (firstResetRef.current) {
        firstResetRef.current = false;
        return;
      }
      vpRef.current = defaultViewport();
      pinnedRef.current = false;
      setCrosshair(null);
      schedule(true);
    }, [resetKey, schedule, setCrosshair]);

    // 가격선 · 이동평균 표시가 바뀌면 다시 그린다
    useEffect(() => {
      schedule(true);
    }, [priceLines, priceBand, hidden, intraday, timeZoneOffsetMinutes, messages, schedule]);

    // 언마운트 — 예약된 프레임을 끊는다
    useEffect(
      () => () => {
        cancelAnimationFrame(pendingRef.current.raf);
        pendingRef.current.raf = 0;
      },
      [],
    );

    // ── 조작
    const plotWidthNow = () => computeLayout(widthRef.current, height).plotWidth;

    const pointAt = useCallback(
      (clientX: number, clientY: number): Crosshair | null => {
        const plot = plotRef.current;
        const s = seriesRef.current;
        if (!plot || s.length === 0) return null;
        const rect = (rectRef.current ??= plot.getBoundingClientRect());
        const plotWidth = computeLayout(widthRef.current, height).plotWidth;
        const x = Math.min(clientX - rect.left, plotWidth);
        return { index: xToIndex(x, s.length, plotWidth, vpRef.current), y: clientY - rect.top };
      },
      [height],
    );

    const applyViewport = useCallback(
      (next: Viewport) => {
        vpRef.current = next;
        schedule(true);
      },
      [schedule],
    );

    const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = {
        pointerId: event.pointerId,
        lastX: event.clientX,
        travelled: 0,
        touch: event.pointerType !== "mouse",
      };
    };

    const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (drag && drag.pointerId === event.pointerId) {
        const dx = event.clientX - drag.lastX;
        drag.lastX = event.clientX;
        drag.travelled += Math.abs(dx);
        if (drag.travelled >= DRAG_THRESHOLD_PX && dx !== 0) {
          applyViewport(panBy(vpRef.current, dx, seriesRef.current.length, plotWidthNow()));
        }
        if (drag.touch) return;
      }
      if (event.pointerType === "mouse" && !pinnedRef.current) {
        setCrosshair(pointAt(event.clientX, event.clientY));
      }
    };

    const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      dragRef.current = null;
      if (!drag || drag.pointerId !== event.pointerId) return;
      // 터치 탭 = 십자선 고정 / 다시 탭하면 해제(FR-24)
      if (drag.touch && drag.travelled < DRAG_THRESHOLD_PX) {
        if (pinnedRef.current) {
          pinnedRef.current = false;
          setCrosshair(null);
        } else {
          pinnedRef.current = true;
          setCrosshair(pointAt(event.clientX, event.clientY));
        }
      }
    };

    // 스크롤하면 영역 좌표가 바뀐다 — 캐시만 버린다(다음 포인터에서 한 번 잰다)
    useEffect(() => {
      const invalidate = () => {
        rectRef.current = null;
      };
      window.addEventListener("scroll", invalidate, { passive: true, capture: true });
      return () => window.removeEventListener("scroll", invalidate, { capture: true });
    }, []);

    /**
     * 브라우저가 제스처를 가져갔다(세로 스와이프 = 페이지 스크롤). **탭으로 치지 않는다** — 가로로는
     * 안 움직였으니 탭처럼 보여서 십자선이 고정되던 버그가 있었다(375px 실측)
     */
    const onPointerCancel = () => {
      dragRef.current = null;
    };

    const onPointerLeave = (event: PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "mouse" && !pinnedRef.current && !dragRef.current) setCrosshair(null);
    };

    // 휠은 `preventDefault` 를 위해 passive 가 아닌 리스너로 — 차트 위에서만 페이지 스크롤을 막는다(FR-22)
    useEffect(() => {
      const plot = plotRef.current;
      if (!plot) return undefined;
      const onWheel = (event: WheelEvent) => {
        const s = seriesRef.current;
        if (s.length === 0) return;
        event.preventDefault();
        const plotWidth = computeLayout(widthRef.current, height).plotWidth;
        if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
          applyViewport(panBy(vpRef.current, -event.deltaX, s.length, plotWidth));
          return;
        }
        const rect = (rectRef.current ??= plot.getBoundingClientRect());
        const factor = Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY);
        applyViewport(zoomAt(vpRef.current, factor, event.clientX - rect.left, s.length, plotWidth));
        if (crosshairRef.current && !pinnedRef.current) {
          setCrosshair(pointAt(event.clientX, event.clientY));
        }
      };
      plot.addEventListener("wheel", onWheel, { passive: false });
      return () => plot.removeEventListener("wheel", onWheel);
    }, [height, applyViewport, pointAt, setCrosshair]);

    const zoomBy = (factor: number) => {
      const plotWidth = plotWidthNow();
      applyViewport(zoomAt(vpRef.current, factor, plotWidth, seriesRef.current.length, plotWidth));
    };

    const reset = () => {
      pinnedRef.current = false;
      vpRef.current = clampViewport(defaultViewport(), seriesRef.current.length, plotWidthNow());
      setCrosshair(null);
      schedule(true);
    };

    /** 키보드로 옮긴 봉이 화면 밖이면 그만큼 끌어온다 */
    const reveal = (index: number) => {
      const s = seriesRef.current;
      const plotWidth = plotWidthNow();
      const x = indexToX(index, s.length, plotWidth, vpRef.current);
      const half = vpRef.current.barSpacing / 2;
      if (x < half) applyViewport(panBy(vpRef.current, half - x, s.length, plotWidth));
      else if (x > plotWidth - half) applyViewport(panBy(vpRef.current, plotWidth - half - x, s.length, plotWidth));
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      const s = seriesRef.current;
      if (s.length === 0) return;
      const current = crosshairRef.current?.index ?? s.length - 1;
      const step = event.shiftKey ? KEY_PAGE_STEP : 1;
      let next: number | null = null;
      switch (event.key) {
        case "ArrowLeft":
          next = Math.max(0, current - step);
          break;
        case "ArrowRight":
          next = Math.min(s.length - 1, current + step);
          break;
        case "Home":
          next = 0;
          break;
        case "End":
          next = s.length - 1;
          break;
        case "+":
        case "=":
          zoomBy(ZOOM_STEP);
          break;
        case "-":
        case "_":
          zoomBy(1 / ZOOM_STEP);
          break;
        case "Escape":
          pinnedRef.current = false;
          setCrosshair(null);
          break;
        default:
          return;
      }
      event.preventDefault();
      if (next !== null) {
        pinnedRef.current = true;
        reveal(next);
        setCrosshair({ index: next, y: null });
      }
    };

    // ── 범례 · 요약 (DOM)
    const legendIndex = hoverIndex !== null && hoverIndex < series.length ? hoverIndex : series.length - 1;
    const summary = useMemo(() => {
      if (series.length === 0) return messages.empty;
      const all = extremaIndices(series, 0, series.length - 1);
      const time = (i: number) => formatFullTime(series.time[i]!, timeZoneOffsetMinutes, intraday);
      return messages.summary({
        name,
        count: series.length,
        first: time(0),
        last: time(series.length - 1),
        high: formatPrice(series.high[all.high]!),
        highAt: time(all.high),
        low: formatPrice(series.low[all.low]!),
        lowAt: time(all.low),
        close: formatPrice(series.close[series.length - 1]!),
      });
    }, [series, name, intraday, timeZoneOffsetMinutes, messages]);

    const toggleAverage = (period: number) =>
      setHidden((prev) => {
        const next = new Set(prev);
        if (next.has(period)) next.delete(period);
        else next.add(period);
        return next;
      });

    const volumeLegendTop = layout.volumeTop + 2;

    return (
      <div
        ref={rootRef}
        className={styles.root}
        role="group"
        aria-label={messages.groupLabel(name)}
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        {/* 버튼은 캔버스 밖 — 차트 위에 두면 최고가 표시 · 범위 밖 가격선 표시를 가린다(2026-09-22 실측) */}
        <div className={styles.header}>
          <Legend
            series={series}
            index={legendIndex}
            hidden={hidden}
            onToggle={toggleAverage}
            intraday={intraday}
            offsetMinutes={timeZoneOffsetMinutes}
            messages={messages}
            aside={legendAside}
          />
          <div className={styles.controls} role="toolbar" aria-label={messages.controlsLabel}>
            <button type="button" className={styles.controlButton} aria-label={messages.zoomIn} title={messages.zoomIn} onClick={() => zoomBy(ZOOM_STEP)}>
              <Plus size={CONTROL_ICON_SIZE} strokeWidth={2} aria-hidden="true" />
            </button>
            <button type="button" className={styles.controlButton} aria-label={messages.zoomOut} title={messages.zoomOut} onClick={() => zoomBy(1 / ZOOM_STEP)}>
              <Minus size={CONTROL_ICON_SIZE} strokeWidth={2} aria-hidden="true" />
            </button>
            <button type="button" className={styles.controlButton} aria-label={messages.reset} title={messages.reset} onClick={reset}>
              <RotateCcw size={CONTROL_ICON_SIZE - 1} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div
          ref={plotRef}
          className={styles.plot}
          style={{ height }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onPointerLeave={onPointerLeave}
          onPointerEnter={() => {
            rectRef.current = null;
          }}
          onDoubleClick={reset}
        >
          <canvas ref={baseRef} className={styles.canvas} aria-hidden="true" />
          <canvas ref={overlayRef} className={styles.canvas} aria-hidden="true" />
          {series.length === 0 ? (
            <div className={styles.empty}>{messages.empty}</div>
          ) : (
            <div className={styles.volumeLegend} style={{ top: volumeLegendTop }}>
              <span>
                {messages.volume} {formatCompact(series.volume[legendIndex]!)}
              </span>
              {!Number.isNaN(series.volumeAverage[legendIndex]!) && (
                <span>
                  {messages.volumeAverage(VOLUME_AVERAGE_PERIOD)}{" "}
                  {formatCompact(series.volumeAverage[legendIndex]!)}
                </span>
              )}
            </div>
          )}
        </div>
        <p className={styles.srOnly}>{summary}</p>
      </div>
    );
  },
);

TradingChart.displayName = "TradingChart";

interface LegendProps {
  series: ChartSeries;
  index: number;
  hidden: ReadonlySet<number>;
  onToggle: (period: number) => void;
  intraday: boolean;
  offsetMinutes: number;
  messages: TradingChartMessages;
  aside?: ReactNode;
}

/** 범례 — 가리킨 봉(없으면 마지막 봉)의 값. 봉 번호가 바뀔 때만 다시 그린다 */
const Legend = memo(({ series, index, hidden, onToggle, intraday, offsetMinutes, messages, aside }: LegendProps) => {
  if (series.length === 0 || index < 0) {
    return <div className={styles.legend}>{aside}</div>;
  }
  const prevClose = index > 0 ? series.close[index - 1]! : series.open[index]!;
  const close = series.close[index]!;
  const ratio = prevClose ? (close - prevClose) / prevClose : 0;
  const tone = ratio > 0 ? "up" : ratio < 0 ? "down" : "flat";
  const value = (term: string, v: number) => (
    <span>
      <span className={styles.legendTerm}>{term}</span>
      {formatPrice(v)}
    </span>
  );
  return (
    <div className={styles.legend}>
      <div className={styles.legendRow}>
        <span>{formatFullTime(series.time[index]!, offsetMinutes, intraday)}</span>
        {value(messages.open, series.open[index]!)}
        {value(messages.high, series.high[index]!)}
        {value(messages.low, series.low[index]!)}
        {value(messages.close, close)}
        <span className={styles.change[tone]}>{formatSignedPercent(ratio)}</span>
        {aside}
      </div>
      <div className={styles.legendRow}>
        {series.movingAverages.map((ma, order) => {
          const visible = !hidden.has(ma.period);
          const v = ma.values[index]!;
          return (
            <button
              key={ma.period}
              type="button"
              className={styles.averageToggle}
              aria-pressed={visible}
              aria-label={messages.toggleAverage(ma.period, visible)}
              onClick={() => onToggle(ma.period)}
            >
              <span className={styles.swatch} style={{ background: movingAverageColor(order) }} />
              <span className={styles.legendTerm}>{messages.movingAverage(ma.period)}</span>
              {Number.isNaN(v) ? "—" : formatPrice(v)}
            </button>
          );
        })}
      </div>
    </div>
  );
});

Legend.displayName = "TradingChartLegend";

export default TradingChart;

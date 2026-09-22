import { describe, expect, it } from "vitest";

import { formatCompact, formatPrice, formatSignedPercent } from "./format";
import { simpleMovingAverage } from "./indicators";
import { decimalsForStep, linearScale, niceStep, niceTicks, priceExtent } from "./scale";
import { buildTimeTicks, calendarParts, formatFullTime } from "./time";
import {
  clampViewport,
  DEFAULT_OFFSET,
  followAppend,
  indexToX,
  MAX_BAR_SPACING,
  MIN_BAR_SPACING,
  panBy,
  visibleRange,
  xToIndex,
  zoomAt,
} from "./viewport";

const KST = 540;
const LABELS = {
  year: (y: number) => String(y),
  month: (m: number) => `${m}월`,
  day: (m: number, d: number) => `${m}/${d}`,
  time: (h: number, mi: number) => `${h}:${String(mi).padStart(2, "0")}`,
};

describe("scale", () => {
  it("보기 좋은 간격 1 · 2 · 2.5 · 5 × 10ⁿ", () => {
    expect(niceStep(1000, 5)).toBe(200);
    expect(niceStep(1_234_567, 6)).toBe(250_000);
    expect(niceStep(0.037, 4)).toBeCloseTo(0.01);
  });

  it("눈금은 간격의 배수이고 범위 안이다", () => {
    const ticks = niceTicks(1_130_000, 1_980_000, 5);
    expect(ticks[0]).toBe(1_200_000);
    expect(ticks.every((t) => t >= 1_130_000 && t <= 1_980_000)).toBe(true);
    expect(ticks.every((t) => t % 200_000 === 0)).toBe(true);
  });

  it("소수 간격은 그만큼 자릿수", () => {
    expect(decimalsForStep(1000)).toBe(0);
    expect(decimalsForStep(0.05)).toBe(2);
    expect(decimalsForStep(0.0001)).toBe(4);
  });

  it("선형 스케일은 왕복한다", () => {
    const s = linearScale(100, 200, 10, 110);
    expect(s.toY(200)).toBe(10);
    expect(s.toY(100)).toBe(110);
    expect(s.fromY(s.toY(137))).toBeCloseTo(137);
  });

  it("가격 범위는 보이는 봉의 저가~고가 + 여백만", () => {
    const e = priceExtent([90, 80, 95], [110, 120, 100], 1, 2, 0.1);
    expect(e.min).toBeCloseTo(80 - 4);
    expect(e.max).toBeCloseTo(120 + 4);
  });
});

describe("simpleMovingAverage", () => {
  it("앞부분은 NaN, 이후 평균", () => {
    const ma = simpleMovingAverage([1, 2, 3, 4, 5], 3);
    expect(Number.isNaN(ma[0])).toBe(true);
    expect(Number.isNaN(ma[1])).toBe(true);
    expect(Array.from(ma.slice(2))).toEqual([2, 3, 4]);
  });

  it("표본이 기간보다 적으면 전부 NaN", () => {
    expect(Array.from(simpleMovingAverage([1, 2], 5)).every(Number.isNaN)).toBe(true);
  });
});

describe("viewport", () => {
  const W = 800;
  const vp = { barSpacing: 10, offset: 0 };

  it("x ↔ 봉 번호 왕복", () => {
    const x = indexToX(150, 200, W, vp);
    expect(xToIndex(x, 200, W, vp)).toBe(150);
    expect(xToIndex(x + 4, 200, W, vp)).toBe(150);
  });

  it("마지막 봉 중심은 offset 0 이면 오른쪽 끝에서 반 칸", () => {
    expect(indexToX(199, 200, W, vp)).toBe(W - 5);
  });

  it("보이는 범위", () => {
    expect(visibleRange(200, W, vp)).toEqual({ from: 120, to: 199 });
    expect(visibleRange(0, W, vp)).toBeNull();
  });

  it("오른쪽으로 끌면 과거로 간다", () => {
    const next = panBy(vp, 100, 200, W);
    expect(next.offset).toBeCloseTo(-10);
  });

  it("경계: 가장 오래된 봉 너머로 가지 않는다", () => {
    const far = panBy(vp, 100_000, 200, W);
    const range = visibleRange(200, W, far)!;
    expect(range.from).toBe(0);
    expect(range.to - range.from + 1).toBeGreaterThanOrEqual(5);
  });

  it("확대는 포인터 아래 봉을 고정한다", () => {
    const anchorX = indexToX(170, 200, W, vp);
    const zoomed = zoomAt(vp, 2, anchorX, 200, W);
    expect(zoomed.barSpacing).toBe(20);
    expect(indexToX(170, 200, W, zoomed)).toBeCloseTo(anchorX);
  });

  it("봉 폭은 최소 · 최대 안", () => {
    expect(zoomAt(vp, 100, 400, 200, W).barSpacing).toBe(MAX_BAR_SPACING);
    expect(zoomAt(vp, 0.001, 400, 200, W).barSpacing).toBe(MIN_BAR_SPACING);
  });

  it("최근 끝을 보면 새 봉을 따라가고, 과거를 보면 붙잡는다", () => {
    expect(followAppend({ barSpacing: 10, offset: DEFAULT_OFFSET }, 1).offset).toBe(DEFAULT_OFFSET);
    expect(followAppend({ barSpacing: 10, offset: -20 }, 1).offset).toBe(-21);
  });

  it("봉이 적어도 clamp 가 뒤집히지 않는다", () => {
    const c = clampViewport({ barSpacing: 10, offset: -50 }, 3, W);
    expect(Number.isFinite(c.offset)).toBe(true);
    expect(visibleRange(3, W, c)).not.toBeNull();
  });
});

describe("time", () => {
  it("브라우저 시간대와 무관하게 KST 로 읽는다", () => {
    // 2026-09-22T00:30:00+09:00 = 2026-09-21T15:30:00Z
    const t = Date.UTC(2026, 8, 21, 15, 30);
    expect(calendarParts(t, KST)).toEqual({ year: 2026, month: 9, day: 22, hour: 0, minute: 30 });
    expect(formatFullTime(t, KST, true)).toBe("2026-09-22 00:30");
  });

  it("일봉 — 월 경계에 라벨, 해가 바뀌면 연도", () => {
    const day = 86_400_000;
    const start = Date.UTC(2025, 10, 1) - KST * 60_000; // 2025-11-01 00:00 KST
    const times = Array.from({ length: 120 }, (_, i) => start + i * day);
    const ticks = buildTimeTicks(times, 0, 119, 8, false, KST, 60, LABELS);
    const labels = ticks.map((t) => t.label);
    expect(labels).toContain("12월");
    expect(labels).toContain("2026");
    expect(labels).not.toContain("1월");
    expect(ticks.find((t) => t.label === "2026")!.major).toBe(true);
  });

  it("라벨 사이 최소 간격을 지킨다", () => {
    const day = 86_400_000;
    const times = Array.from({ length: 200 }, (_, i) => i * day);
    const ticks = buildTimeTicks(times, 0, 199, 12, false, KST, 60, LABELS);
    for (let i = 1; i < ticks.length; i += 1) {
      expect((ticks[i]!.index - ticks[i - 1]!.index) * 12).toBeGreaterThanOrEqual(60);
    }
  });

  it("분봉 — 날이 바뀌면 날짜, 그 사이는 시각", () => {
    const min5 = 5 * 60_000;
    const start = Date.UTC(2026, 8, 21, 13, 0); // 22:00 KST
    const times = Array.from({ length: 48 }, (_, i) => start + i * min5);
    const ticks = buildTimeTicks(times, 0, 47, 10, true, KST, 60, LABELS);
    expect(ticks.some((t) => t.label === "9/22" && t.major)).toBe(true);
    expect(ticks.some((t) => /:\d\d$/.test(t.label))).toBe(true);
  });
});

describe("format", () => {
  it("가격 · 거래량 · 등락률", () => {
    expect(formatPrice(1_867_000)).toBe("1,867,000");
    expect(formatPrice(12.345)).toBe("12.35");
    expect(formatCompact(5_510_000)).toBe("5.51M");
    expect(formatSignedPercent(-0.0005)).toBe("−0.05%");
    expect(formatSignedPercent(0.0142)).toBe("+1.42%");
  });
});

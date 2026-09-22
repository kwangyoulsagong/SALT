/**
 * 뷰포트 — 봉 폭(px)과 오른쪽 끝에서 마지막 봉까지의 거리(봉 단위).
 *
 * 봉 i 의 중심 x = plotWidth − (length − 1 − i + offset) × barSpacing − barSpacing / 2.
 *
 * 좌표는 **끝에서부터** 센다. 새 봉이 붙어도 `offset` 이 같으면 화면이 따라가고(최근 끝을 볼 때),
 * 과거를 볼 때는 `offset` 을 한 칸 줄여 화면을 붙잡는다(`FE-REQ-034` FR-26).
 *
 * - `offset > 0` 마지막 봉 오른쪽에 빈 칸이 있다
 * - `offset < 0` 마지막 봉이 화면 밖 오른쪽이다(과거를 보는 중)
 */
export interface Viewport {
  barSpacing: number;
  offset: number;
}

export const MIN_BAR_SPACING = 2;
export const MAX_BAR_SPACING = 48;
export const DEFAULT_BAR_SPACING = 8;
/** 기본 보기 — 마지막 봉 오른쪽 빈 칸 */
export const DEFAULT_OFFSET = 3;
/** 이동 · 확대 뒤에도 화면에 남아야 하는 최소 봉 수 */
export const MIN_VISIBLE_BARS = 5;

export const defaultViewport = (): Viewport => ({
  barSpacing: DEFAULT_BAR_SPACING,
  offset: DEFAULT_OFFSET,
});

/** 봉 `index` 의 중심 x (plot 영역 기준) */
export const indexToX = (
  index: number,
  length: number,
  plotWidth: number,
  vp: Viewport,
): number =>
  plotWidth - (length - 1 - index + vp.offset) * vp.barSpacing - vp.barSpacing / 2;

/** x 에 가장 가까운 봉 번호(범위 밖이면 가장자리로 자른다). 봉이 없으면 -1 */
export const xToIndex = (
  x: number,
  length: number,
  plotWidth: number,
  vp: Viewport,
): number => {
  if (length === 0) return -1;
  const raw = length - 1 + vp.offset - (plotWidth - x - vp.barSpacing / 2) / vp.barSpacing;
  return Math.min(length - 1, Math.max(0, Math.round(raw)));
};

/** 화면에 걸친 봉 범위 `[from, to]`(포함). 봉이 없으면 `null` */
export const visibleRange = (
  length: number,
  plotWidth: number,
  vp: Viewport,
): { from: number; to: number } | null => {
  if (length === 0) return null;
  // 봉 i 의 몸통이 [0, plotWidth] 에 걸친다 ⇔ len-1+offset-plotBars < i < len+offset
  const to = Math.min(length - 1, Math.ceil(length + vp.offset) - 1);
  const from = Math.max(0, Math.floor(length - 1 + vp.offset - plotWidth / vp.barSpacing) + 1);
  return from > to ? null : { from, to };
};

/** 경계 — 최소 `MIN_VISIBLE_BARS` 개는 화면에 남긴다 */
export const clampViewport = (
  vp: Viewport,
  length: number,
  plotWidth: number,
): Viewport => {
  const barSpacing = Math.min(MAX_BAR_SPACING, Math.max(MIN_BAR_SPACING, vp.barSpacing));
  const plotBars = plotWidth / barSpacing;
  const keep = Math.min(MIN_VISIBLE_BARS, Math.max(1, length));
  // 과거 쪽: 가장 오래된 봉이 keep 개는 보이게
  const minOffset = -(length - keep);
  // 미래 쪽: 최근 봉이 keep 개는 보이게
  const maxOffset = Math.max(DEFAULT_OFFSET, plotBars - keep);
  const offset = Math.min(maxOffset, Math.max(Math.min(minOffset, maxOffset), vp.offset));
  return { barSpacing, offset };
};

/** 드래그 — 오른쪽으로 끌면(dx > 0) 과거가 보인다 */
export const panBy = (
  vp: Viewport,
  dxPx: number,
  length: number,
  plotWidth: number,
): Viewport =>
  clampViewport({ ...vp, offset: vp.offset - dxPx / vp.barSpacing }, length, plotWidth);

/** 확대/축소 — `anchorX` 아래의 봉 위치를 고정한다(`FE-REQ-034` FR-22) */
export const zoomAt = (
  vp: Viewport,
  factor: number,
  anchorX: number,
  length: number,
  plotWidth: number,
): Viewport => {
  const barSpacing = Math.min(MAX_BAR_SPACING, Math.max(MIN_BAR_SPACING, vp.barSpacing * factor));
  if (barSpacing === vp.barSpacing) return vp;
  // anchorX 아래의 (실수) 봉 위치를 새 폭에서도 같은 x 에 둔다
  const anchorIndex =
    length - 1 + vp.offset - (plotWidth - anchorX - vp.barSpacing / 2) / vp.barSpacing;
  const offset =
    (plotWidth - anchorX - barSpacing / 2) / barSpacing - (length - 1 - anchorIndex);
  return clampViewport({ barSpacing, offset }, length, plotWidth);
};

/** 새 봉이 `added` 개 붙었을 때 — 과거를 보고 있으면 화면을 붙잡는다 */
export const followAppend = (vp: Viewport, added: number): Viewport =>
  vp.offset < 0 ? { ...vp, offset: vp.offset - added } : vp;

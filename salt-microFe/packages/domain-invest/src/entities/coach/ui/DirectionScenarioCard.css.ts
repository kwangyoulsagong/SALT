import { style, styleVariants } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/**
 * 시나리오 카드 — AI 패널(`FE-REQ-064` FR-4 · FR-6). 기준 앱 실측: 패널 이름 칩 13/600 모서리 7 · 막대 6 ·
 * 상승 · 하락 색은 토큰(special.up · down). 막힌 지평도 같은 높이를 차지한다(세그먼트를 바꿔도 CLS 0).
 */
const SCENARIO_MIN_HEIGHT = "188px";

export const card = style({
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  minWidth: 0,
  maxWidth: "720px",
  minHeight: SCENARIO_MIN_HEIGHT,
});

export const headRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  flexWrap: "wrap",
});

export const nameChip = style({
  display: "inline-flex",
  alignItems: "center",
  height: "24px",
  padding: "0 8px",
  borderRadius: "7px",
  background: "rgba(7,25,76,.04)",
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.primary,
});

export const oddsRow = style({ display: "flex", alignItems: "baseline", gap: "8px" });

export const oddsLabel = style({
  fontSize: "13px",
  lineHeight: "20px",
  color: vars.colors.text.secondary,
});

/** 큰 숫자 — 26/700. 색은 방향을 뜻하지 않는다(확률은 판단이 아니라 숫자다) */
export const oddsValue = style({
  fontSize: "26px",
  lineHeight: "32px",
  fontWeight: vars.fontWeights.bold,
  color: vars.colors.text.primary,
  fontVariantNumeric: "tabular-nums",
});

/** 2분할 막대 — 오른 몫 · 내린 몫(높이 6) */
export const split = style({
  display: "flex",
  height: "6px",
  borderRadius: "3px",
  overflow: "hidden",
  background: vars.colors.neutral[200],
});

export const splitPart = styleVariants({
  up: { background: vars.colors.special.up },
  down: { background: vars.colors.special.down },
});

export const line = style({
  margin: 0,
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  color: vars.colors.text.primary,
  fontVariantNumeric: "tabular-nums",
  wordBreak: "keep-all",
});

export const meta = style([line, { color: vars.colors.text.secondary }]);

/** 범위 띠 — 0 선 · 80% 띠 · 가운데 눈금. 비대칭은 데이터 그대로(바깥선 없음) */
export const band = style({
  position: "relative",
  height: "18px",
  borderRadius: "4px",
  background: vars.colors.neutral[100],
});

export const bandFill = style({
  position: "absolute",
  top: "4px",
  bottom: "4px",
  borderRadius: "3px",
  background: "rgba(34,114,235,.18)",
});

export const bandMid = style({
  position: "absolute",
  top: "1px",
  bottom: "1px",
  width: "2px",
  marginLeft: "-1px",
  background: vars.colors.text.primary,
});

export const bandZero = style({
  position: "absolute",
  top: 0,
  bottom: 0,
  width: "1px",
  background: vars.colors.text.tertiary,
});

/** 성적 막대 둘 — 이 시나리오 vs 늘 오른다(같은 확신 행) */
export const trackBars = style({ display: "flex", flexDirection: "column", gap: "4px" });

export const trackRow = style({
  display: "grid",
  gridTemplateColumns: "72px 1fr 40px",
  alignItems: "center",
  gap: "8px",
  fontSize: "12px",
  lineHeight: "18px",
  color: vars.colors.text.secondary,
  fontVariantNumeric: "tabular-nums",
});

export const trackBar = style({ height: "6px", borderRadius: "3px", background: vars.colors.neutral[200], overflow: "hidden" });

export const trackFill = styleVariants({
  model: { height: "100%", background: vars.colors.neutral[700] },
  baseline: { height: "100%", background: vars.colors.neutral[400] },
});

export const blockedTitle = style({
  margin: 0,
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.primary,
});

export const more = style({ minWidth: 0 });

export const moreSummary = style({
  cursor: "pointer",
  minHeight: "32px",
  display: "flex",
  alignItems: "center",
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.secondary,
});

export const moreList = style({
  margin: 0,
  padding: "4px 0 0",
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  fontSize: "13px",
  lineHeight: "20px",
  color: vars.colors.text.primary,
  fontVariantNumeric: "tabular-nums",
});

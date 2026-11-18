import { style } from "@vanilla-extract/css";
import { vars } from "../../styles/tokens.css";

/** 칸보다 넓으면 비율을 지켜 줄어든다(최대는 본래 폭 — 인라인 `maxWidth`) */
export const radarSvg = style({ display: "block", overflow: "visible", width: "100%", height: "auto" });

/** 격자(동심 다각형 · 바퀴살) — 값보다 흐리게 */
export const radarGrid = style({ fill: "none", stroke: vars.colors.neutral[200], strokeWidth: 1 });

/** 상한선 — 점선 · 경고색. 넘음은 되돌릴 수 있는 상태라 빨강(`danger`)을 쓰지 않는다 */
export const radarLimit = style({
  fill: "none",
  stroke: vars.colors.status.warning,
  strokeWidth: 1.5,
  strokeDasharray: "4 3",
});

export const radarValue = style({
  fill: vars.colors.brand.primary,
  fillOpacity: 0.16,
  stroke: vars.colors.brand.primary,
  strokeWidth: 2,
  strokeLinejoin: "round",
});

export const radarPoint = style({ fill: vars.colors.brand.primary });
export const radarPointBreached = style({ fill: vars.colors.status.warningDark });

export const radarLabel = style({
  fill: vars.colors.neutral[700],
  fontSize: 12,
  fontFamily: vars.fontFamily.base,
});
export const radarLabelMissing = style({ fill: vars.colors.neutral[400] });

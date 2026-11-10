import { style } from "@vanilla-extract/css";

import { vars } from "../../styles/tokens.css";

/**
 * 유리막 — 흐린 아래 칸 위에 반투명 면 + 가운데 단추. 그림자 없음(`screen-desktop.md` §3 — 카드 그림자 금지).
 * 흐림은 정적(애니메이션 0 — `performance.md` blur 애니메이션 금지).
 */
export const signInGlassStyles = {
  root: style({
    position: "relative",
    overflow: "hidden",
    borderRadius: vars.radius.medium,
    isolation: "isolate",
  }),
  under: style({
    filter: "blur(6px)",
    opacity: 0.6,
    pointerEvents: "none",
    userSelect: "none",
  }),
  veil: style({
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: vars.space.sm,
    padding: vars.space.lg,
    background: "rgba(251, 252, 253, 0.72)",
    textAlign: "center",
    selectors: {
      // 자리 표시가 없으면 막 자체가 칸이다 — 흐름에 들어가 높이를 갖는다
      "&:only-child": { position: "static" },
    },
  }),
  description: style({
    margin: 0,
    maxWidth: 320,
    color: vars.colors.text.lightGray,
    fontFamily: vars.fontFamily.base,
    fontSize: vars.typography.t7.fontSize,
    lineHeight: vars.typography.t7.lineHeight,
    wordBreak: "keep-all",
  }),
  action: style({
    display: "inline-flex",
    alignItems: "center",
    height: 32,
    padding: `0 ${vars.space.md}`,
    borderRadius: vars.radius.button.sm,
    background: vars.colors.brand.primary,
    color: vars.colors.text.white,
    fontFamily: vars.fontFamily.base,
    fontSize: 14,
    fontWeight: vars.fontWeights.semibold,
    textDecoration: "none",
    selectors: {
      "&:hover": { background: vars.colors.brand.hover },
      "&:focus-visible": { outline: `2px solid ${vars.colors.brand.active}`, outlineOffset: 2 },
    },
  }),
};

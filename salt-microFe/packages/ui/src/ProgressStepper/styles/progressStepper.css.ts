import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const listStyles = style({
  display: "flex",
  alignItems: "flex-start",
  width: "100%",
  margin: 0,
  padding: 0,
  listStyle: "none",
  fontFamily: vars.fontFamily.base,
});

export const stepStyles = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: vars.space.xs,
  flex: 1,
  minWidth: 0,
  position: "relative",
});

export const markerRowStyles = style({
  display: "flex",
  alignItems: "center",
  width: "100%",
});

/**
 * 연결선 — 회색 바탕 위에 브랜드 색이 왼쪽부터 차오른다(FE-REQ-044 P-35).
 * 색을 바꾸지 않고 `::after` 의 `scaleX` 만 움직인다(transform 만 애니메이션).
 */
export const connectorStyles = recipe({
  base: {
    position: "relative",
    flex: 1,
    height: "2px",
    overflow: "hidden",
    background: vars.colors.neutral[200],
    "::after": {
      content: '""',
      position: "absolute",
      inset: 0,
      background: vars.colors.brand.primary,
      transform: "scaleX(0)",
      transformOrigin: "left center",
      transition: `transform ${vars.motion.duration.slow} ${vars.motion.easing.enter}`,
    },
    "@media": {
      "(prefers-reduced-motion: reduce)": {
        "::after": { transition: "none" },
      },
    },
  },

  variants: {
    filled: {
      true: { "::after": { transform: "scaleX(1)" } },
      false: {},
    },
    hidden: {
      true: { visibility: "hidden" },
      false: {},
    },
  },

  defaultVariants: {
    filled: false,
    hidden: false,
  },
});

export const markerStyles = recipe({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    width: "24px",
    height: "24px",
    borderRadius: vars.radius.full,
    fontSize: vars.typography.t8.fontSize,
    fontWeight: vars.fontWeights.bold,
    fontVariantNumeric: vars.numeric.tabular,
    transition: `transform ${vars.motion.duration.base} ${vars.motion.easing.enter}, background-color ${vars.motion.duration.base}`,
    "@media": {
      "(prefers-reduced-motion: reduce)": { transition: "none" },
    },
  },

  variants: {
    state: {
      done: {
        background: vars.colors.brand.primary,
        color: vars.colors.text.white,
      },
      current: {
        background: vars.colors.brand.lighter,
        color: vars.colors.brand.active,
        boxShadow: `0 0 0 2px ${vars.colors.brand.primary}`,
        // 지금 단계 표식이 살짝 커진다 — 연결선이 다 찬 뒤에
        transform: "scale(1.08)",
        transitionDelay: vars.motion.duration.base,
      },
      upcoming: {
        background: vars.colors.neutral[100],
        color: vars.colors.text.tertiary,
      },
    },
  },

  defaultVariants: {
    state: "upcoming",
  },
});

export const labelStyles = recipe({
  base: {
    maxWidth: "100%",
    textAlign: "center",
    fontSize: vars.typography.t8.fontSize,
    lineHeight: vars.typography.t8.lineHeight,
    wordBreak: "keep-all",
  },

  variants: {
    state: {
      // 회색 페이지 배경(#F2F4F6) 위라 tertiary(2.76:1)가 AA 미달 — neutral 700(6.45:1). 사용자 승인 2026-09-30 (FE-REQ-044)
      done: { color: vars.colors.neutral[700] },
      current: {
        color: vars.colors.text.primary,
        fontWeight: vars.fontWeights.bold,
      },
      upcoming: { color: vars.colors.neutral[700] },
    },
  },

  defaultVariants: {
    state: "upcoming",
  },
});

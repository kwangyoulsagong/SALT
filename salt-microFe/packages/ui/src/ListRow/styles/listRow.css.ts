import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";
import { PRESS_SELECTOR, PRESS_TRANSITION, pressActive, pressReducedMotion } from "../../styles/press";
import { HOVER_TRANSITION } from "../../styles/transition";

export const listRowStyles = recipe({
  base: {
    display: "flex",
    alignItems: "center",
    gap: vars.space.md,
    width: "100%",
    minHeight: "56px",
    padding: `${vars.space.md} ${vars.space.lg2}`,
    border: "none",
    background: vars.colors.background.white,
    fontFamily: vars.fontFamily.base,
    textAlign: "left",
  },

  variants: {
    pressable: {
      true: {
        cursor: "pointer",
        transition: `${HOVER_TRANSITION}, ${PRESS_TRANSITION}`,
        ...pressReducedMotion,

        selectors: {
          [PRESS_SELECTOR]: pressActive,
          "&:hover": {
            background: vars.colors.neutral[50],
          },
          "&:active": {
            background: vars.colors.neutral[100],
          },
        },
      },
      false: {},
    },

    divider: {
      true: {
        boxShadow: `inset 0 -1px 0 ${vars.colors.border.light}`,
      },
      false: {},
    },
  },

  defaultVariants: {
    pressable: false,
    divider: false,
  },
});

export const leadingStyles = style({
  display: "flex",
  alignItems: "center",
  flexShrink: 0,
});

export const bodyStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  flex: 1,
  minWidth: 0,
});

export const titleStyles = style({
  color: vars.colors.text.primary,
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,
  fontWeight: vars.fontWeights.medium,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const captionStyles = style({
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const trailingStyles = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: "2px",
  flexShrink: 0,
  color: vars.colors.text.primary,
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,
  fontWeight: vars.fontWeights.semibold,
});

export const trailingBottomStyles = style({
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  fontWeight: vars.fontWeights.regular,
  color: vars.colors.text.tertiary,
});

export const chevronStyles = style({
  flexShrink: 0,
  color: vars.colors.neutral[400],
});

/* ── 데스크톱 밀도(`FE-REQ-060` FR-3 · `screen-desktop.md` §4 "날짜 묶음 목록") ─────────────────────
 * 행 44(보조 줄 있으면 56) · 왼쪽 판 32 · 이름 13/600 1단 · 보조 12/500 2단 · 금액 13/600 오른쪽 `tabular-nums` · 호버 면 모서리 8.
 * 바탕을 칠하지 않는다 — 놓는 패널 면을 그대로 쓴다 */
export const deskRow = style({
  minHeight: "44px",
  padding: "6px 8px",
  gap: "12px",
  borderRadius: "8px",
  background: "transparent",
  selectors: {
    "&:has(> span > span + span)": { minHeight: "56px" },
  },
});
export const deskPressable = style({
  selectors: { "&:hover": { background: vars.colors.desk.line }, "&:active": { background: vars.colors.desk.line } },
});
export const deskTitle = style({
  color: vars.colors.desk.text1,
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
});
export const deskCaption = style({
  color: vars.colors.desk.text2,
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
});
export const deskTrailing = style({
  color: vars.colors.desk.text1,
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  fontVariantNumeric: "tabular-nums",
});
export const deskTrailingBottom = style({
  color: vars.colors.desk.text2,
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
});

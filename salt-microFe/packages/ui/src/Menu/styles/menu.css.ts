import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const wrapperStyles = style({
  position: "relative",
  display: "inline-flex",
});

export const listStyles = recipe({
  base: {
    position: "absolute",
    zIndex: vars.zIndices.dropdown,
    minWidth: "180px",
    // 글자 폭만큼 — 절대 위치라 여는 버튼(작은 아이콘) 폭에 맞춰 줄어들어 항목이 두 줄로 꺾였다(2026-11-19 F006 칸 옮기기 메뉴)
    width: "max-content",
    maxWidth: "min(320px, calc(100vw - 32px))",
    margin: 0,
    padding: vars.space.xs,
    listStyle: "none",
    borderRadius: vars.radius.medium,
    background: vars.colors.background.white,
    boxShadow: vars.elevation.md,
    fontFamily: vars.fontFamily.base,
  },

  variants: {
    align: {
      start: { left: 0 },
      end: { right: 0 },
    },
    /** 아래 자리가 모자라면 위로 연다(화면 아래쪽 칸 머리말의 메뉴가 화면 밖으로 잘리지 않게) */
    side: {
      bottom: { top: "calc(100% + 4px)" },
      top: { bottom: "calc(100% + 4px)" },
    },
  },

  defaultVariants: {
    align: "end",
    side: "bottom",
  },
});

export const itemStyles = recipe({
  base: {
    display: "flex",
    alignItems: "center",
    gap: vars.space.sm,
    width: "100%",
    minHeight: "40px",
    padding: `0 ${vars.space.md}`,
    border: "none",
    borderRadius: vars.radius.base,
    background: "transparent",
    color: vars.colors.text.primary,
    fontFamily: vars.fontFamily.base,
    fontSize: vars.typography.t6.fontSize,
    lineHeight: vars.typography.t6.lineHeight,
    textAlign: "left",
    cursor: "pointer",

    selectors: {
      "&:hover:not(:disabled)": {
        background: vars.colors.neutral[50],
      },
      "&:disabled": {
        color: vars.colors.text.disabled,
        cursor: "not-allowed",
      },
    },
  },

  variants: {
    tone: {
      default: {},
      danger: { color: vars.colors.status.errorDark },
    },
  },

  defaultVariants: {
    tone: "default",
  },
});

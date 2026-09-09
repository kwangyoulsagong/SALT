import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const bottomCTAStyles = recipe({
  base: {
    display: "flex",
    alignItems: "center",
    gap: vars.space.sm,
    width: "100%",
    padding: `${vars.space.md} ${vars.space.lg2}`,
    // 홈 인디케이터 위로 버튼이 올라오게 한다.
    paddingBottom: `calc(${vars.space.md} + env(safe-area-inset-bottom, 0px))`,
    background: vars.colors.background.white,
    fontFamily: vars.fontFamily.base,
  },

  variants: {
    fixed: {
      true: {
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: vars.zIndices.fixed,
        // 실제로 떠 있는 요소라 그림자를 쓴다 (FE-REQ-005 D-8).
        boxShadow: vars.elevation.sheet,
      },
      false: {
        boxShadow: `inset 0 1px 0 ${vars.colors.border.light}`,
      },
    },
  },

  defaultVariants: {
    fixed: false,
  },
});

/** children이 버튼 하나든 둘이든 같은 폭 규칙으로 늘어난다. */
export const actionsStyles = recipe({
  base: {
    display: "grid",
    gap: vars.space.sm,
    flex: 1,
    minWidth: 0,
  },

  variants: {
    layout: {
      single: { gridTemplateColumns: "1fr" },
      double: { gridTemplateColumns: "1fr 1fr" },
    },
  },

  defaultVariants: {
    layout: "single",
  },
});

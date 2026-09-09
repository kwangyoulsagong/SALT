import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

export const cardStyles = recipe({
  base: {
    width: "100%",
    borderRadius: vars.radius.xl,
    background: vars.colors.background.white,
  },

  variants: {
    padding: {
      none: {
        padding: vars.space.none,
      },
      sm: {
        padding: vars.space.md,
      },
      md: {
        padding: vars.space.lg,
      },
      lg: {
        padding: vars.space.xl,
      },
      xl: {
        padding: vars.space["2xl"],
      },
    },

    /**
     * 기본값은 `none`이다 (FE-REQ-005 D-8).
     * 모든 블록에 그림자가 깔리면 위계가 사라진다.
     * 실제로 떠 있어야 하는 카드에만 `sm` 이상을 준다.
     */
    elevation: {
      none: {
        boxShadow: vars.elevation.none,
      },
      sm: {
        boxShadow: vars.elevation.sm,
      },
      md: {
        boxShadow: vars.elevation.md,
      },
      lg: {
        boxShadow: vars.elevation.lg,
      },
    },

    bordered: {
      true: {
        border: `1px solid ${vars.colors.border.light}`,
      },
      false: {},
    },
  },

  defaultVariants: {
    padding: "md",
    elevation: "none",
    bordered: false,
  },
});

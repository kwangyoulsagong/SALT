import { keyframes } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

const rotate = keyframes({
  from: { transform: "rotate(0deg)" },
  to: { transform: "rotate(360deg)" },
});

export const spinnerStyles = recipe({
  base: {
    display: "inline-block",
    flexShrink: 0,
    borderStyle: "solid",
    borderRadius: vars.radius.full,
    animation: `${rotate} 0.7s linear infinite`,

    "@media": {
      // 로딩 표시는 필수 피드백이라 멈추지 않고 느리게만 돈다.
      "(prefers-reduced-motion: reduce)": {
        animationDuration: "2s",
      },
    },
  },

  variants: {
    size: {
      sm: { width: "16px", height: "16px", borderWidth: "2px" },
      md: { width: "24px", height: "24px", borderWidth: "2.5px" },
      lg: { width: "36px", height: "36px", borderWidth: "3px" },
    },

    tone: {
      brand: {
        borderColor: vars.colors.brand.lighter,
        borderTopColor: vars.colors.brand.primary,
      },
      neutral: {
        borderColor: vars.colors.neutral[200],
        borderTopColor: vars.colors.neutral[500],
      },
      white: {
        borderColor: "rgba(255,255,255,.35)",
        borderTopColor: vars.colors.text.white,
      },
    },
  },

  defaultVariants: {
    size: "md",
    tone: "brand",
  },
});

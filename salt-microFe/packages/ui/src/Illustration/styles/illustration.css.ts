import { recipe } from "@vanilla-extract/recipes";

export const illustrationStyles = recipe({
  base: {
    display: "block",
    flexShrink: 0,
    height: "auto",
    overflow: "visible",
  },
  variants: {
    size: {
      /** 빽빽한 패널 머리 한 칸(48 — AI 해설 상자, `FE-REQ-079` FR-6) */
      xs: { width: "48px" },
      sm: { width: "96px" },
      md: { width: "160px" },
      lg: { width: "220px" },
    },
  },
  defaultVariants: { size: "md" },
});

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
      sm: { width: "96px" },
      md: { width: "160px" },
      lg: { width: "220px" },
    },
  },
  defaultVariants: { size: "md" },
});

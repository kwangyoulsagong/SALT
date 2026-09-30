import { recipe } from "@vanilla-extract/recipes";

export const statusGraphicStyles = recipe({
  base: {
    display: "block",
    flexShrink: 0,
    overflow: "visible",
  },
  variants: {
    size: {
      sm: { width: "40px", height: "40px" },
      md: { width: "72px", height: "72px" },
      lg: { width: "120px", height: "120px" },
    },
  },
  defaultVariants: { size: "md" },
});

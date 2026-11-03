import { recipe } from "@vanilla-extract/recipes";

export const progressSceneStyles = recipe({
  base: { display: "block", flexShrink: 0, height: "auto", overflow: "visible" },
  variants: {
    size: {
      sm: { width: "160px" },
      md: { width: "240px" },
    },
  },
  defaultVariants: { size: "md" },
});

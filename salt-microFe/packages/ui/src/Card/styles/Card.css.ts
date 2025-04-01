import { styleVariants } from "@vanilla-extract/css";
const commonStyles = {
  width: "92%",
  borderRadius: "20px",
  background: "#FFFFFF",
};

export const CardSize = styleVariants({
  md: {
    ...commonStyles,
    height: "125px",
  },
  lg: {
    ...commonStyles,
    height: "139px",
  },
});

import { styleVariants } from "@vanilla-extract/css";
const commonStyles = {
  width: "90%",
  borderRadius: "20px",
  background: "#FFFFFF",
};

export const CardSize = styleVariants({
  md: {
    ...commonStyles,
    height: "119px",
  },
  lg: {
    ...commonStyles,
    height: "133px",
  },
});

import { styleVariants } from "@vanilla-extract/css";
import { vars } from "../../../styles/tokens.css";

const commonStyles = {
  fontSize: vars.fontSizes.small,
  fontWeight: vars.fontWeights.medium,
  color: vars.colors.text.primary,
};
export const pVariant = styleVariants({
  email: {
    ...commonStyles.fontWeight,
    color: vars.colors.text.email,
    fontSize: vars.fontSizes.body,
  },
  primary: {
    ...commonStyles,
  },
  third: {
    ...commonStyles.color,
    fontSize: vars.fontSizes.xsmall,
    fontWeight: vars.fontWeights.bold,
  },
});

import { styleVariants } from "@vanilla-extract/css";
import { vars } from "../../../styles/tokens.css";

const commonStyles = {
  fontSize: vars.fontSizes.small,
  fontWeight: vars.fontWeights.medium,
};
export const pVariant = styleVariants({
  email: {
    ...commonStyles.fontWeight,
    color: vars.colors.text.email,
    fontSize: vars.fontSizes.body,
  },
  primary: {
    ...commonStyles,
    color: vars.colors.text.primary,
  },
});

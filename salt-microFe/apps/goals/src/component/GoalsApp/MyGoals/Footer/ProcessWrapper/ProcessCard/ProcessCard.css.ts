import { vars } from "@/styles/tokens.css";
import { style } from "@vanilla-extract/css";
export const Card = style({
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  borderRight: "2px solid #F7F7F7",
  gap: "2px",
  selectors: {
    "&:nth-child(4)": {
      borderRight: "none",
    },
  },
});

export const Process = style({
  color: vars.colors.text.secondary,
  fontWeight: vars.fontWeights.bold,
  fontSize: "12px",
});

import { vars } from "@/styles/tokens.css";
import { style } from "@vanilla-extract/css";
import { LineChartIcon } from "lucide-react";

export const SentimentText = style({
  fontSize: vars.fontSizes.extraHeadding,
  color: "#FF6B30",
  fontWeight: vars.fontWeights.medium,
});

export const SentimentTemperatureText = style({
  fontSize: "50px",
  fontWeight: vars.fontWeights.bold,
  background: "linear-gradient(180deg, #FF5E64 0%, #FFFFFF 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
});

export const SentimentTemperatureProgressBarWrapper = style({
  width: "100%",
});

export const SentimentTemperatureProgressBarFrame = style({
  position: "absolute",
  width: "100%",
  height: "8px",
  borderRadius: 15,
  backgroundColor: "#F0F2F4",
});

export const SentimentTemperatureProgressBarInProgress = style({
  position: "absolute",
  height: "8px",
  width: "100%",
  borderRadius: 15,
  backgroundColor: "#FF5E64",
  transformOrigin: "left",
  transform: "scaleX(0)",
  transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
  willChange: "transform",
});

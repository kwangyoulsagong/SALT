import { vars } from "@/styles/tokens.css";
import { style } from "@vanilla-extract/css";

export const SentimentText = style({
  fontSize: vars.fontSizes.extraHeadding,
  color: "#FF6B30",
  fontWeight: vars.fontWeights.medium,
  margin: 0,
});

export const SentimentTemperatureText = style({
  fontSize: "50px",
  fontWeight: vars.fontWeights.bold,
  background: "linear-gradient(180deg, #FF5E64 0%, #FFFFFF 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
  margin: 0,
});

export const SentimentTemperatureProgressBarWrapper = style({
  width: "100%",
  position: "relative",
  height: "8px",
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

export const CircularProgressWrapper = style({
  position: "relative",
  width: "104px",
  height: "104px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

export const CircularProgressSvg = style({
  transform: "rotate(127deg)",
  width: "100%",
  height: "100%",
});

export const CircularProgressBackground = style({
  fill: "none",
  stroke: "#F0F2F4",
  strokeWidth: "6",
  strokeLinecap: "round",
  // 원의 79%만 표시 (238.26 = 2π * 48 * 0.79)
  strokeDasharray: "238.26 301.59",
});

export const CircularProgressValue = style({
  fill: "none",
  strokeWidth: "6",
  strokeLinecap: "round",
  transition:
    "stroke 0.3s ease, stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
  willChange: "stroke, stroke-dashoffset",
});

export const CircularProgressCenterText = style({
  position: "absolute",
  fontSize: "30px",
  fontWeight: vars.fontWeights.bold,
  background: "linear-gradient(180deg, #737576 0%, #FFFFFF 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
  margin: 0,
});

export const SmartMoneyMessage = style({
  fontSize: "14px",
  color: "#6B7280",
  margin: 0,
  lineHeight: 1.5,
});

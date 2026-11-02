// src/components/ChangeRateCell/changeRateCell.css.ts
import { style, keyframes } from "@vanilla-extract/css";

const blinkUp = keyframes({
  "0%": { background: "#FFEFF1" },
  "100%": { background: "transparent" },
});

const blinkDown = keyframes({
  "0%": { background: "#EAF3FF" },
  "100%": { background: "transparent" },
});

export const wrapper = style({
  padding: "2px 6px",
  borderRadius: "5px",
  display: "inline-block",
});

export const blinkUpClass = style([
  wrapper,
  {
    animation: `${blinkUp} 0.8s ease-out`,
  },
]);

export const blinkDownClass = style([
  wrapper,
  {
    animation: `${blinkDown} 0.8s ease-out`,
  },
]);

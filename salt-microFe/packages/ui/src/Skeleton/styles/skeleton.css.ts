import { keyframes, style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

/**
 * 반짝임 한 줄 (FE-REQ-062 FR-4) — 칸 안의 밝은 띠 하나가 왼쪽에서 오른쪽으로 지나간다.
 * 배경 위치(`background-position`)를 옮기면 매 프레임 칠한다 — 띠는 `::after` 한 장이고 **`transform` 만** 움직인다.
 * 칸 밖으로 나간 띠는 `overflow: hidden` 이 자른다. 줄인 모션이면 띠 없이 옅은 면 그대로(멈춘 회색 칸도 "기다리는 중"으로 읽힌다).
 */
const sweep = keyframes({
  from: { transform: "translateX(-100%)" },
  to: { transform: "translateX(100%)" },
});

export const skeletonStyles = recipe({
  base: {
    position: "relative",
    display: "block",
    overflow: "hidden",
    background: vars.colors.neutral[100],

    selectors: {
      "&::after": {
        content: '""',
        position: "absolute",
        inset: 0,
        background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent)",
        transform: "translateX(-100%)",
        animation: `${sweep} ${vars.motion.duration.loop} ${vars.motion.easing.standard} infinite`,
      },
    },

    "@media": {
      "(prefers-reduced-motion: reduce)": {
        selectors: { "&::after": { display: "none" } },
      },
    },
  },

  variants: {
    radius: {
      none: { borderRadius: vars.radius.none },
      small: { borderRadius: vars.radius.small },
      base: { borderRadius: vars.radius.base },
      medium: { borderRadius: vars.radius.medium },
      full: { borderRadius: vars.radius.full },
    },
  },

  defaultVariants: {
    radius: "small",
  },
});

export const linesStyles = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.sm,
  width: "100%",
});

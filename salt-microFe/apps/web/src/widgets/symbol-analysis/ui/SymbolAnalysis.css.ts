import { style } from "@vanilla-extract/css";
import { vars } from "@repo/ui/tokens";

/** `FE-REQ-026` FR-120 과 같은 경계 — 이 폭 이하는 세로 한 줄이다 */
const STACK_BREAKPOINT = "1024px";
const SIDE_WIDTH = "380px";
const CARD_RADIUS = "16px";

export const layout = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.xl,
  minWidth: 0,
});

export const hero = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: vars.space.lg,
});

/**
 * 가격 줄 높이. 가격은 시세 목록 · 판단 응답이 온 뒤에야 있어서, 자리를 잡지 않으면 도착 순간
 * 아래 전체가 19px 밀렸다(CLS 0.097, 2026-09-22 프로덕션 빌드 실측)
 */
const HERO_PRICE_MIN_HEIGHT = "25px";

export const heroName = style({
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
});

export const heroPrice = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.lg,
  minHeight: HERO_PRICE_MIN_HEIGHT,
});

export const backLink = style({
  color: vars.colors.text.tertiary,
  fontSize: vars.fontSizes.base,
  textDecoration: "none",
  ":hover": { textDecoration: "underline" },
});

export const grid = style({
  display: "grid",
  gridTemplateColumns: `minmax(0, 1fr) ${SIDE_WIDTH}`,
  gap: vars.space.xl,
  alignItems: "start",
  "@media": {
    [`screen and (max-width: ${STACK_BREAKPOINT})`]: {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
});

export const column = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.xl,
  minWidth: 0,
});

export const card = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.lg,
  padding: vars.space.xl,
  borderRadius: CARD_RADIUS,
  border: `1px solid ${vars.colors.border.light}`,
  background: vars.colors.background.white,
  minWidth: 0,
});

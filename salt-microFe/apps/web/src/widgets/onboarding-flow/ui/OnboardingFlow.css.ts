import { style } from "@vanilla-extract/css";
import { vars } from "@repo/ui/tokens";

/** 단계 머리 장면 — 가운데, 위아래로 옅은 그라데이션 판 (FE-REQ-044 P-20) */
export const stepHead = style({
  display: "flex",
  alignSelf: "stretch",
  justifyContent: "center",
  padding: `${vars.space.md} 0`,
  borderRadius: vars.radius.large,
  background: `linear-gradient(180deg, ${vars.colors.graphic.backdrop} 0%, ${vars.colors.background.white} 100%)`,
});

export const acceptedLine = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  margin: 0,
  color: vars.colors.text.primary,
  fontSize: vars.typography.t6.fontSize,
  fontWeight: vars.fontWeights.semibold,
});

/** 옆으로 밀리는 단계 본문 — 세로 FlexBox 안에서 줄어들지 않게 폭을 채운다 */
export const stepSlide = style({
  width: "100%",
});

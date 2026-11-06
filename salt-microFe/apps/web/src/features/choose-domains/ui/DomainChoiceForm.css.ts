import { style } from "@vanilla-extract/css";
import { vars } from "@repo/ui/tokens";

/** 고르기 폼 — 온보딩 한 열 안(폭 440). 줄마다 체크 · 이름 · 한 줄 설명, 왼쪽 정렬(가운데 정렬 제목 아래라도 목록은 읽는 방향으로) */
export const form = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.lg,
  width: "100%",
  marginTop: vars.space.xl,
  textAlign: "left",
});

export const list = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.sm,
  margin: 0,
  padding: 0,
  border: "none",
});

export const legend = style({
  padding: 0,
  color: vars.colors.text.primary,
  fontWeight: vars.fontWeights.semibold,
});

export const row = style({
  padding: `${vars.space.md} ${vars.space.lg}`,
  borderRadius: vars.radius.medium,
  background: vars.colors.background.white,
  border: `1px solid ${vars.colors.neutral[200]}`,
});

export const text = style({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
});

export const label = style({
  color: vars.colors.text.primary,
  fontWeight: vars.fontWeights.semibold,
});

/** 설명 — 회색 600(#6B7684, 흰 바탕 위 4.83:1). 회색 500(#8B95A1)은 3.03:1 로 AA 미달(2026-11-06 알림 패널 axe) */
export const hint = style({
  margin: 0,
  color: vars.colors.text.lightGray,
});

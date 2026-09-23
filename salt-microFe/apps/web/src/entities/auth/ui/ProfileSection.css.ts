import { vars } from "@/shared/ui/tokens.css";
import { style } from "@vanilla-extract/css";

/**
 * 이름 · 이메일 묶음.
 *
 * 래퍼가 **`width: 100px`** 고정이었다(2026-09-23 정정). 이메일이 세 줄로 접혀 헤더가
 * 무너졌고, 이름도 옆 칸으로 밀려 보였다. 너비는 내용과 부모가 정하고, 넘치면 **줄바꿈이
 * 아니라 말줄임**으로 끊는다 — 헤더 높이가 사용자 이메일 길이에 따라 달라지면 안 된다.
 */
const ellipsis = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
} as const;

export const Wrapper = style({
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  gap: "2px",
  minWidth: 0,
});

export const Name = style({
  color: vars.colors.text.nickname,
  fontSize: vars.fontSizes.heading3,
  fontWeight: vars.fontWeights.semibold,
  ...ellipsis,
});

export const Email = style({
  color: vars.colors.text.email,
  fontSize: vars.fontSizes.body,
  ...ellipsis,
});

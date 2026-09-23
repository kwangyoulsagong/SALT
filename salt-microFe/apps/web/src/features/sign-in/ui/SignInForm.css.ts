import { style } from "@vanilla-extract/css";
import { vars } from "@repo/ui/tokens";

/**
 * 로그인 폼.
 *
 * 입력 두 개와 버튼 하나뿐이라 **간격이 유일한 구조**다. 필드 사이는 좁게(같은 묶음),
 * 버튼 앞은 넓게(다른 묶음) 둔다 — 둘을 같은 간격으로 두면 버튼이 세 번째 입력처럼 보인다.
 */
export const form = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.md,
  width: "100%",
});

export const submitRow = style({
  marginTop: vars.space.lg,
});

export const inviteRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: vars.space.xs,
  marginTop: vars.space.xl,
});

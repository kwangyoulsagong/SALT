import { style } from "@vanilla-extract/css";
import { vars } from "@repo/ui/tokens";

/**
 * 로그인 폼.
 *
 * 입력 두 개는 **붙여** 한 묶음으로 보이게 하고(참고 화면과 같은 배치), 버튼 앞에만
 * 넓은 간격을 둔다. 셋을 같은 간격으로 두면 버튼이 세 번째 입력처럼 보인다.
 */
export const form = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.md,
  width: "100%",
});

export const fields = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.sm,
});

export const submitRow = style({
  marginTop: vars.space.sm,
});

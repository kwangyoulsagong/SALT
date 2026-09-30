import { style } from "@vanilla-extract/css";
import { vars } from "@repo/ui/tokens";

/**
 * 위 여백이 `15%`(폭 기준 약 190px 빈칸)였다. 그 자리를 페이지 머리 과녁 장면이 채운다(`FE-REQ-044` P-23) —
 * 둘 다 두면 폼이 밀려 하단 고정 버튼이 안내 한 줄을 가렸다.
 */
export const Container = style({
  marginTop: vars.space.xl,
  width: "100%",
  display: "flex",
  alignItems: "center",
  flexDirection: "column",
});

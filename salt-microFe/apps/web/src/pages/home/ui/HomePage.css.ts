import { style } from "@vanilla-extract/css";

/** 화면에는 없고 스크린리더만 읽는다 — 홈은 보이는 페이지 제목이 없다(axe page-has-heading-one) */
export const srOnly = style({
  position: "absolute",
  width: "1px",
  height: "1px",
  margin: "-1px",
  padding: 0,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
});

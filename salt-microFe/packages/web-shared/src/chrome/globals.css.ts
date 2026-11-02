import { globalStyle } from "@vanilla-extract/css";
import { vars as ds } from "@repo/ui/tokens";

import { vars } from "../ui/tokens.css";

globalStyle("*", {
  margin: 0,
  padding: 0,
  boxSizing: "border-box",
});

globalStyle("body", {
  background: vars.colors.background.primary,
  color: vars.colors.text.primary,
  // 기본 글꼴 — 전에는 body 에 없어 컴포넌트가 따로 걸지 않은 글자는 브라우저 기본 글꼴이었다
  fontFamily: ds.fontFamily.base,
  fontSize: vars.fontSizes.body,
  fontWeight: vars.fontWeights.regular,
});

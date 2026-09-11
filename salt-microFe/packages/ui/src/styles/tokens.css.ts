import { createGlobalTheme, globalFontFace } from "@vanilla-extract/css";
import { tokens } from "@repo/tokens";

globalFontFace("Inter", {
  src: 'url(https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQsN.woff2) format("woff2")',
  fontDisplay: "swap",
});

globalFontFace("Noto Sans KR", {
  src: 'url(https://fonts.gstatic.com/s/notosanskr/v36/PbykFmXiEBPT4gqyIkITq3XeXA.woff2) format("woff2")',
  fontWeight: "100 900",
  fontDisplay: "swap",
});

/**
 * 웹 어댑터 (FE-REQ-007 FR-30).
 *
 * 값은 `@repo/tokens`에 있다. 여기서는 그 값을 CSS 변수로 바꾸기만 한다.
 * **토큰 값을 이 파일에 추가하지 않는다.** 추가하면 RN이 같은 값을 못 본다.
 */
export const vars = createGlobalTheme(":root", tokens);

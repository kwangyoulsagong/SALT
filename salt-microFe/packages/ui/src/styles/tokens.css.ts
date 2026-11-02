import { createGlobalTheme } from "@vanilla-extract/css";
import { tokens } from "@repo/tokens";

/**
 * 웹 어댑터 (FE-REQ-007 FR-30).
 *
 * 값은 `@repo/tokens`에 있다. 여기서는 그 값을 CSS 변수로 바꾸기만 한다.
 * **토큰 값을 이 파일에 추가하지 않는다.** 추가하면 RN이 같은 값을 못 본다.
 */
const { motion, ...themeTokens } = tokens;

/**
 * 모션 토큰은 숫자라(`motion` · `reanimated` 가 읽는다) CSS 변수로는 **문자열로 바꿔서만** 올린다
 * (FE-REQ-044 FR-1). `@keyframes` · `transition` 을 `*.css.ts` 에서 쓸 때 이 변수를 쓴다.
 */
const motionCss = {
  duration: Object.fromEntries(
    Object.entries(motion.duration).map(([key, value]) => [key, `${Math.round(value * 1000)}ms`]),
  ) as Record<keyof typeof motion.duration, string>,
  easing: Object.fromEntries(
    Object.entries(motion.easing).map(([key, value]) => [key, `cubic-bezier(${value.join(", ")})`]),
  ) as Record<keyof typeof motion.easing, string>,
};

/**
 * 글꼴은 **웹에서 실제로 실린 글꼴 변수**로 잇는다(2026-11-02). 전에는 여기서 구글 폰트 파일 주소를 직접 박은
 * `@font-face` 를 걸었는데 그 버전 파일이 사라져(404) 모든 화면이 시스템 글꼴로 그려지고 있었다. 이제 zone 레이아웃이
 * `next/font` 로 빌드 때 받아 같은 origin 으로 서비스하고(`@repo/web-shared/layout` `FONT_VARIABLES`) 그 변수를
 * `<html>` 에 건다. 변수가 없는 곳(Storybook)은 토큰의 이름 그대로 — 값은 `@repo/tokens` 와 같다(RN 이 같은 이름을 쓴다).
 */
const webFont = {
  inter: "var(--font-inter, 'Inter')",
  notoSansKr: "var(--font-noto-sans-kr, 'Noto Sans KR')",
};
const fontFamily: Record<keyof typeof themeTokens.fontFamily, string> = {
  base: `${webFont.inter}, ${webFont.notoSansKr}, sans-serif`,
  sans: `${webFont.inter}, sans-serif`,
  korean: `${webFont.notoSansKr}, sans-serif`,
  secondary: `${webFont.notoSansKr}, sans-serif`,
};

export const vars = createGlobalTheme(":root", { ...themeTokens, fontFamily, motion: motionCss });

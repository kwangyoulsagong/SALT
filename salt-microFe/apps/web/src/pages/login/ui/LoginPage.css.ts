import { style } from "@vanilla-extract/css";
import { vars } from "@repo/ui/tokens";

/**
 * 로그인 화면.
 *
 * ## 한 열로 가운데 세운다
 *
 * 이 화면에는 결정이 하나뿐이다(들어가기). 폭을 넓게 쓰면 눈이 좌우로 흔들리고, 카드로
 * 감싸면 "설정 화면 안의 폼"처럼 보인다. **폭을 문장 길이로 제한**하고 배경은 앱 배경
 * 그대로 둔다.
 *
 * 위쪽 여백이 아래보다 크다 — 제목이 화면 중앙보다 조금 위에 오는 것이 읽기 시작점으로
 * 자연스럽다. 모바일에서는 위 여백을 줄여 입력이 키패드에 가려지지 않게 한다.
 */
const FORM_MAX_WIDTH = "400px";
const MOBILE = "screen and (max-width: 480px)";

export const screen = style({
  minHeight: "100%",
  display: "flex",
  justifyContent: "center",
  padding: `${vars.space["4xl"]} ${vars.space.lg} ${vars.space["2xl"]}`,
  "@media": {
    [MOBILE]: {
      padding: `${vars.space["2xl"]} ${vars.space.lg} ${vars.space.xl}`,
    },
  },
});

export const column = style({
  width: "100%",
  maxWidth: FORM_MAX_WIDTH,
  display: "flex",
  flexDirection: "column",
});

/** 제목 묶음. 폼과의 거리가 제목·보조문구 사이보다 훨씬 넓다 — 묶음이 둘임을 간격이 말한다. */
export const intro = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.xs,
  marginBottom: vars.space["3xl"],
});

export const brandMark = style({
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,
  fontWeight: vars.fontWeights.bold,
  letterSpacing: "0.08em",
  color: vars.colors.brand.primary,
  marginBottom: vars.space.md,
});

export const title = style({
  fontSize: vars.typography.t2.fontSize,
  lineHeight: vars.typography.t2.lineHeight,
  fontWeight: vars.fontWeights.bold,
  color: vars.colors.text.primary,
  margin: 0,
});

import { style } from "@vanilla-extract/css";
import { vars } from "@repo/ui/tokens";

/**
 * 로그인 화면.
 *
 * ## 배경 · 제목 · 카드 세 층
 *
 * 참고한 금융 서비스 로그인 화면의 구조를 따랐다(2026-09-23 사용자 제공 화면):
 * **옅은 그라데이션 배경 위에 큰 제목, 그 아래 흰 카드**. 카드가 시선을 한 곳에 모으고
 * 배경이 화면 전체를 비어 보이지 않게 한다 — 입력 두 개짜리 폼이 회색 배경에 그냥 놓이면
 * 설정 화면의 한 조각처럼 보인다.
 *
 * 제목은 토큰 스케일(t1 = 30)보다 크다. 이 화면에서 제목은 **유일한 큰 요소**이고
 * 카드와 크기 차이가 나야 층이 읽힌다. 한 화면의 수치라 토큰으로 올리지 않는다.
 */
const CARD_MAX_WIDTH = "460px";
const CARD_RADIUS = "20px";
const TITLE_SIZE = "clamp(28px, 3.4vw, 38px)";
const MOBILE = "screen and (max-width: 480px)";

export const screen = style({
  minHeight: "100dvh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: `${vars.space["4xl"]} ${vars.space.lg}`,
  /**
   * 배경은 **옅은 메시**다(참고 화면과 같은 인상). 단색 회색 위에 흰 카드를 놓으면 카드가
   * "폼 영역"으로만 보이는데, 색이 아주 옅게 흐르면 화면 전체가 하나의 장면이 된다.
   *
   * 라디얼 셋을 겹친다 — 왼쪽 위 푸른 기, 오른쪽 위 보랏기(브랜드 색의 아주 옅은 농도),
   * 아래쪽은 흰색으로 빠진다. 채도를 더 올리면 카드 안 글자 대비가 떨어진다.
   */
  background: [
    "radial-gradient(1200px 600px at 8% 0%, #DDE8FB 0%, rgba(221,232,251,0) 60%)",
    "radial-gradient(900px 520px at 92% 4%, #E6E2FB 0%, rgba(230,226,251,0) 58%)",
    "radial-gradient(1000px 640px at 50% 100%, #F4F6FA 0%, rgba(244,246,250,0) 62%)",
    vars.colors.background.white,
  ].join(", "),
  "@media": {
    [MOBILE]: {
      justifyContent: "flex-start",
      padding: `${vars.space["2xl"]} ${vars.space.lg} ${vars.space.xl}`,
    },
  },
});

/** 좌상단 브랜드. 화면 흐름에서 빠져 있어야 제목이 첫 줄로 읽힌다. */
export const brandMark = style({
  position: "absolute",
  top: vars.space.xl,
  left: vars.space.xl,
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,
  fontWeight: vars.fontWeights.bold,
  letterSpacing: "0.08em",
  color: vars.colors.brand.primary,
  "@media": {
    [MOBILE]: { position: "static", alignSelf: "flex-start", marginBottom: vars.space.xl },
  },
});

export const title = style({
  fontSize: TITLE_SIZE,
  lineHeight: 1.3,
  fontWeight: vars.fontWeights.bold,
  color: vars.colors.text.primary,
  textAlign: "center",
  margin: `0 0 ${vars.space["2xl"]}`,
});

export const card = style({
  width: "100%",
  maxWidth: CARD_MAX_WIDTH,
  background: vars.colors.background.white,
  borderRadius: CARD_RADIUS,
  padding: `${vars.space["3xl"]} ${vars.space["2xl"]}`,
  /** 옅은 배경 위라 그림자를 약하게 둔다 — 강하면 카드가 떠 보이고 배경이 죽는다. */
  boxShadow: vars.elevation.sm,
  "@media": {
    [MOBILE]: { padding: `${vars.space.xl} ${vars.space.lg}` },
  },
});

/** 카드 **밖** 안내. 로그인하지 못하는 사람이 갈 곳이라 카드 안의 행동과 층을 나눈다. */
export const inviteRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: vars.space.xs,
  marginTop: vars.space.xl,
});

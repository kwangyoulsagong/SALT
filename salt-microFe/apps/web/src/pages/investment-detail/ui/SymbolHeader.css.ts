import { style } from "@vanilla-extract/css";
import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@/shared/ui/surface.css";

/**
 * 상세 분석 머리 — 뒤로 · 로고 · 이름 · 가격 · 요약 지표. **서버에서도 렌더된다**(SEO — 종목 이름 ·
 * 가격이 HTML 에 있어야 한다). 본문(차트 · 판단)은 브라우저 전용이라 `widgets/symbol-analysis` 에 남는다.
 */
const NARROW = "screen and (max-width: 640px)";
const CARD_RADIUS = SURFACE.panelRadius;
const CARD_SHADOW = SURFACE.hairline;

export const backLink = style({
  alignSelf: "flex-start",
  color: vars.colors.neutral[600],
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  textDecoration: "none",
  ":hover": { color: vars.colors.neutral[800] },
});

/* ── 종목 헤더 ──────────────────────────────────────────────── */

/**
 * 종목 헤더 카드.
 *
 * 헤더가 배경 위에 그냥 떠 있으면 지표 · 가격 · 이름이 각각 놓인 글자 덩어리로 보인다.
 * **카드로 묶으면** 아래 패널들과 같은 언어가 되고, 화면이 카드 네 장으로 읽힌다.
 */
export const headerCard = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: vars.space["2xl"],
  flexWrap: "wrap",
  padding: "20px 24px",
  borderRadius: CARD_RADIUS,
  background: vars.colors.background.white,
  boxShadow: CARD_SHADOW,
  "@media": {
    [NARROW]: { padding: vars.space.lg, gap: vars.space.lg },
  },
});

export const identity = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.sm,
  minWidth: 0,
});

export const nameRow = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  minWidth: 0,
});

export const name = style({
  fontSize: "17px",
  lineHeight: "24px",
  fontWeight: vars.fontWeights.bold,
  color: vars.colors.text.primary,
  margin: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const ticker = style({
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.medium,
  color: vars.colors.neutral[500],
  fontVariantNumeric: vars.numeric.tabular,
});

/**
 * 가격 줄. 시세 · 판단이 온 뒤에야 값이 있어서 자리를 먼저 잡는다 — 잡지 않으면 도착 순간
 * 아래 전체가 밀린다(CLS 0.097, 2026-09-22 실측). 글자가 커진 만큼 높이도 키웠다.
 */
export const priceRow = style({
  display: "flex",
  alignItems: "baseline",
  gap: vars.space.md,
  minHeight: "34px",
});

/** 이 화면의 주인공. 이름(t5)과 두 단계 차이를 둬야 먼저 읽힌다. */
export const price = style({
  fontSize: "26px",
  lineHeight: "34px",
  fontWeight: vars.fontWeights.bold,
  color: vars.colors.text.primary,
  fontVariantNumeric: vars.numeric.tabular,
});

/* ── 요약 지표 ──────────────────────────────────────────────── */

/**
 * 지표 묶음. 참고 화면처럼 **라벨 위 · 값 아래**로 촘촘히 세운다. 한 줄에 다 넣지 않고
 * 자동 줄바꿈으로 흐르게 둔다 — 좁은 화면에서 가로 스크롤이 생기지 않는다.
 */
/** 지표 줄 + 관심 버튼. 버튼은 **헤더 오른쪽 끝**이다 — 이름 옆에 붙이면 제목의 일부로 보인다. */
export const statsRow = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.lg,
  minWidth: 0,
});

export const stats = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "flex-start",
  gap: `${vars.space.md} ${vars.space.xl}`,
  /** 가로로 흐른다. `auto-fit` 격자로 두었더니 헤더의 남은 폭 안에서 **한 줄에 하나씩**
   *  쌓여 헤더가 화면 높이의 절반이 됐다(2026-09-23 실측). 지표는 가로가 기본이고,
   *  좁아지면 줄바꿈으로 내려간다. */
  maxWidth: "620px",
  "@media": {
    [NARROW]: { width: "100%", gap: vars.space.lg },
  },
});

/**
 * 지표 한 칸. **칸 사이에 세로 선**을 둔다 — 간격만으로 나누면 라벨과 값이 세로로 정렬돼
 * 격자처럼 보이고, 어디까지가 한 칸인지 흐려진다(참고 화면도 선으로 나눈다).
 */
export const stat = style({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  /** 라벨이 두 줄로 접히지 않을 만큼만. 이보다 좁히면 "24시간 범위"가 깨진다. */
  minWidth: "116px",
  paddingLeft: vars.space.xl,
  borderLeft: `1px solid ${vars.colors.border.light}`,
  selectors: {
    "&:first-child": { paddingLeft: 0, borderLeft: "none" },
  },
});

export const statLabel = style({
  fontSize: "12px",
  lineHeight: "16px",
  fontWeight: vars.fontWeights.medium,
  color: vars.colors.neutral[500],
});

export const statValue = style({
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.primary,
  fontVariantNumeric: vars.numeric.tabular,
});

/** 저가 ──●── 고가. 위치는 서버가 준 세 값으로 정해지는 **표시 기하**다. */
export const rangeTrack = style({
  position: "relative",
  width: "140px",
  maxWidth: "100%",
  height: "4px",
  borderRadius: vars.radius.full,
  background: vars.colors.neutral[200],
  marginTop: "6px",
});

export const rangeDot = style({
  position: "absolute",
  top: "-2px",
  width: "8px",
  height: "8px",
  borderRadius: vars.radius.full,
  background: vars.colors.text.primary,
  transform: "translateX(-50%)",
});

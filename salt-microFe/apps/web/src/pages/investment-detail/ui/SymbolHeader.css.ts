import { keyframes, style, styleVariants } from "@vanilla-extract/css";
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

/** 국내 주식 코치 판단 칸(F011 슬라이스 4) — 머리 카드와 같은 면, 세로로 쌓는다(제목 · 판단 · 한 줄 고지) */
export const krCoachCard = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.md,
  padding: "20px 24px",
  borderRadius: CARD_RADIUS,
  background: vars.colors.background.white,
  boxShadow: CARD_SHADOW,
  // 판단이 열리면 상세 카드(근거 목록 · 성적 표 · 사례)가 맨 `p` · `li` 를 그린다 — 글꼴을 카드가 준다(F011 슬라이스 7b)
  fontFamily: vars.fontFamily.base,
  "@media": {
    [NARROW]: { padding: vars.space.lg },
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
  position: "relative",
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

/** 시간외 단일가 한 줄(슬라이스 6b) — 새 요소라 흰 카드 위 4.5 이상 회색(`lightGray` 4.6). `statLabel`(neutral 500)은 기존 값 */
export const afterHoursLine = style({
  margin: 0,
  fontSize: "12px",
  lineHeight: "16px",
  fontWeight: vars.fontWeights.medium,
  color: vars.colors.text.lightGray,
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

/** 24시간 변동률 — 상승 빨강 · 하락 파랑, 부호도 글자로 준다(색만으로 말하지 않는다) */
const changeBase = {
  fontSize: "15px",
  lineHeight: "22px",
  fontWeight: vars.fontWeights.semibold,
  fontVariantNumeric: vars.numeric.tabular,
} as const;

export const change = styleVariants({
  up: { ...changeBase, color: vars.colors.special.up },
  down: { ...changeBase, color: vars.colors.special.down },
  flat: { ...changeBase, color: vars.colors.neutral[500] },
});

/** 가격이 바뀔 때 밑줄이 한 번 스친다 — 오른 쪽 색. `opacity` 만 움직인다 */
const tickFade = keyframes({ from: { opacity: 0.9 }, to: { opacity: 0 } });
const tickBase = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: "-2px",
  height: "2px",
  borderRadius: vars.radius.full,
  opacity: 0,
  animation: `${tickFade} ${vars.motion.duration.scene} ease-out`,
  "@media": { "(prefers-reduced-motion: reduce)": { animation: "none" } },
} as const;

export const tick = styleVariants({
  up: { ...tickBase, background: vars.colors.special.up },
  down: { ...tickBase, background: vars.colors.special.down },
});

/* ── 국내 주식 본문 — 코인 상세와 같은 격자(F011 슬라이스 3b) ──────────────── */

/**
 * 차트 왼쪽 · 거래 기록 오른쪽. 코인 상세(`widgets/symbol-analysis`)와 같은 폭 · 경계 — "같은 화면, 데이터만 다르다".
 * 국내 주식엔 코치 카드가 없어 오른쪽 열이 거래 기록 하나다
 */
export const krBody = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 380px",
  gap: "16px",
  alignItems: "start",
  "@media": {
    "screen and (max-width: 1024px)": { gridTemplateColumns: "minmax(0, 1fr)" },
  },
});

/** `krBody` 격자 한 칸 — 빈 칸이어도 자리를 지킨다(투자자 표가 없을 때 호가가 왼쪽으로 밀리지 않게) */
export const krCell = style({
  minWidth: 0,
});

/** 국내 주식 오른쪽 열 — 자세히(변동 범위) 위, 거래 기록 아래. 코인 상세 오른쪽 열과 같은 순서(F011 슬라이스 5d) */
export const krSideColumn = style({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  minWidth: 0,
});

/** 코인 상세의 "자세히"(`widgets/symbol-analysis` more*)와 같은 모양 — 위젯 스타일은 페이지에서 import 할 수 없다 */
export const krMore = style({
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
});

export const krMoreSummary = style({
  display: "flex",
  alignItems: "center",
  cursor: "pointer",
  padding: "20px 24px",
  borderRadius: CARD_RADIUS,
  background: vars.colors.background.white,
  boxShadow: CARD_SHADOW,
  fontSize: "15px",
  lineHeight: "22px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.primary,
  ":hover": { background: vars.colors.neutral[50] },
  selectors: { "&:focus-visible": { outline: `2px solid ${vars.colors.neutral[800]}`, outlineOffset: "2px" } },
  "@media": {
    [NARROW]: { padding: "16px" },
  },
});

/** neutral 600 은 4.41:1 로 AA 미달(2026-09-29 axe) — 700 */
export const krMoreHint = style({
  marginLeft: "auto",
  flexShrink: 0,
  whiteSpace: "nowrap",
  color: vars.colors.neutral[700],
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.medium,
});

export const krMoreBody = style({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  marginTop: "16px",
});

export const krSideCard = style({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  padding: "20px 24px 24px",
  borderRadius: CARD_RADIUS,
  background: vars.colors.background.white,
  boxShadow: CARD_SHADOW,
  minWidth: 0,
  "@media": {
    [NARROW]: { padding: "16px 16px 20px" },
  },
});

/**
 * 머리의 [주문 전 체크] — 관심 별 옆 옅은 면 보조 버튼 모양의 해시 링크(FR-131). 거래 기록 폼의 [현재가] 와 같은 면 ·
 * 13/600 이고, 터치 타깃 44px 를 높이로 채운다. 주문 버튼처럼 보이지 않게 채운 색을 쓰지 않는다
 */
export const preflightLink = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  minHeight: "44px",
  padding: "0 12px",
  borderRadius: "10px",
  background: "rgba(7, 25, 76, 0.04)",
  color: "rgba(26, 31, 41, 0.89)",
  fontSize: "13px",
  fontWeight: vars.fontWeights.semibold,
  textDecoration: "none",
  whiteSpace: "nowrap",
  selectors: {
    "&:hover": { background: vars.colors.neutral[100] },
    "&:focus-visible": { outline: `2px solid ${vars.colors.neutral[800]}`, outlineOffset: "2px" },
  },
});

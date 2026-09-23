import { style } from "@vanilla-extract/css";
import { vars } from "@repo/ui/tokens";

/**
 * 상세 분석 화면.
 *
 * ## 무엇을 참고했고 무엇을 따르지 않았나 (2026-09-23)
 *
 * 사용자가 준 증권 상세 화면의 **층 구조**를 따랐다: 종목 줄 → **큰 가격 + 등락** →
 * 요약 지표 묶음 → 카드 패널 격자 → 하단 고정 유의사항. 전에는 이름과 가격이 같은 줄에서
 * 같은 크기로 경쟁했고(`Heading level=2` 옆에 가격), 지표가 아예 없었다.
 *
 * **따르지 않은 것은 섹션 탭이다.** 참고 화면은 패널이 열 개 가까워 탭으로 나눈다. 우리는
 * 블록이 넷(차트 · 판단 · 해설 · 수익 플랜)이라 탭을 두면 스크롤 대신 클릭이 늘고, 판단과
 * 근거가 다른 탭으로 갈라진다 — **근거 3종이 판단과 같은 화면에 있어야 한다**(공통 수용 기준 1).
 *
 * 카드는 테두리 대신 **흰 면 + 옅은 그림자**다. 회색 배경 위에서 테두리까지 그으면 선이
 * 두 겹으로 보인다.
 */

/** 이 폭 이하는 세로 한 줄이다 (`FE-REQ-026` FR-120 과 같은 경계). */
const STACK_BREAKPOINT = "1024px";
const NARROW = "screen and (max-width: 640px)";
const SIDE_WIDTH = "380px";
const CARD_RADIUS = "20px";
/** 하단 고정 바 높이. 본문이 그 아래로 숨지 않게 같은 값만큼 띄운다. */
const DISCLAIMER_BAR_HEIGHT = "44px";

export const layout = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.xl,
  minWidth: 0,
  paddingBottom: DISCLAIMER_BAR_HEIGHT,
});

export const backLink = style({
  alignSelf: "flex-start",
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  textDecoration: "none",
  ":hover": { textDecoration: "underline" },
});

/* ── 종목 헤더 ──────────────────────────────────────────────── */

export const header = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: vars.space.xl,
  flexWrap: "wrap",
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
  fontSize: vars.typography.t4.fontSize,
  lineHeight: vars.typography.t4.lineHeight,
  fontWeight: vars.fontWeights.bold,
  color: vars.colors.text.primary,
  margin: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const ticker = style({
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  color: vars.colors.text.tertiary,
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
  minHeight: "40px",
});

export const price = style({
  fontSize: vars.typography.t2.fontSize,
  lineHeight: vars.typography.t2.lineHeight,
  fontWeight: vars.fontWeights.bold,
  color: vars.colors.text.primary,
  fontVariantNumeric: vars.numeric.tabular,
});

/* ── 요약 지표 ──────────────────────────────────────────────── */

/**
 * 지표 묶음. 참고 화면처럼 **라벨 위 · 값 아래**로 촘촘히 세운다. 한 줄에 다 넣지 않고
 * 자동 줄바꿈으로 흐르게 둔다 — 좁은 화면에서 가로 스크롤이 생기지 않는다.
 */
export const stats = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "flex-start",
  gap: `${vars.space.md} ${vars.space["2xl"]}`,
  /** 가로로 흐른다. `auto-fit` 격자로 두었더니 헤더의 남은 폭 안에서 **한 줄에 하나씩**
   *  쌓여 헤더가 화면 높이의 절반이 됐다(2026-09-23 실측). 지표는 가로가 기본이고,
   *  좁아지면 줄바꿈으로 내려간다. */
  maxWidth: "620px",
  "@media": {
    [NARROW]: { width: "100%", gap: vars.space.lg },
  },
});

export const stat = style({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  /** 라벨이 두 줄로 접히지 않을 만큼만. 이보다 좁히면 "24시간 범위"가 깨진다. */
  minWidth: "116px",
});

export const statLabel = style({
  fontSize: vars.typography.t8.fontSize,
  lineHeight: vars.typography.t8.lineHeight,
  color: vars.colors.text.tertiary,
});

export const statValue = style({
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
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

/* ── 패널 격자 ──────────────────────────────────────────────── */

export const grid = style({
  display: "grid",
  gridTemplateColumns: `minmax(0, 1fr) ${SIDE_WIDTH}`,
  gap: vars.space.lg,
  alignItems: "start",
  "@media": {
    [`screen and (max-width: ${STACK_BREAKPOINT})`]: {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
});

export const column = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.lg,
  minWidth: 0,
});

export const card = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.lg,
  padding: vars.space.xl,
  borderRadius: CARD_RADIUS,
  background: vars.colors.background.white,
  boxShadow: vars.elevation.sm,
  minWidth: 0,
  "@media": {
    [NARROW]: { padding: vars.space.lg },
  },
});

/** 패널 제목 줄. 제목은 작게 — 카드 안에서 가장 큰 것은 내용이어야 한다. */
export const cardHead = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: vars.space.sm,
});

export const cardTitle = style({
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  fontWeight: vars.fontWeights.bold,
  color: vars.colors.text.secondary,
  margin: 0,
});

/* ── 하단 고정 유의사항 ─────────────────────────────────────── */

/**
 * 면책을 화면 하단에 상시 둔다. 카드 안에 있으면 스크롤 위치에 따라 보이지 않는데,
 * **추천 응답에 면책이 항상 붙어야 한다**는 것이 계약이다(`ddd-presentation.md` §5).
 */
export const disclaimerBar = style({
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: vars.zIndices.sticky,
  minHeight: DISCLAIMER_BAR_HEIGHT,
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  padding: `${vars.space.sm} ${vars.space.xl}`,
  background: vars.colors.background.white,
  borderTop: `1px solid ${vars.colors.border.light}`,
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t8.fontSize,
  lineHeight: vars.typography.t8.lineHeight,
});

export const disclaimerLabel = style({
  fontWeight: vars.fontWeights.bold,
  color: vars.colors.text.secondary,
  whiteSpace: "nowrap",
});

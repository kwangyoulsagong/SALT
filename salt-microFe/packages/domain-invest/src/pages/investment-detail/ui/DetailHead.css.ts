import { keyframes, style, styleVariants } from "@vanilla-extract/css";
import { PRESS_SELECTOR, PRESS_TRANSITION, pressActive, pressReducedMotion } from "@repo/ui/press";
import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@repo/web-shared/ui/surface.css";

/**
 * 상세 머리 2줄(`FE-REQ-049` FR-1 · `screen-desktop.md` §4 "상세" — 높이 ≤ 88). 코인 · 국내가 같은 머리다.
 *
 * 1줄: 로고 24 · 이름 14/700 · 코드 13/600 2단 · 시장 칩 · 관심 별 · 상태 배지
 * 2줄: 가격 24/700 · 전일 대비 13/500 · 장 상태
 * 오른쪽: 범위 막대(1일 · 52주) · 핵심 통계 4칸 · [더 보기] · [주문 전 체크]
 *
 * 카드가 아니다 — 본문 패널(`#FBFCFD`) 위에 바로 놓인다. 전에는 흰 카드 안에 통계 15칸 4열 격자라 머리가 약 225px 였다(B4)
 */
/** 머리 = 두 줄. 각 줄은 왼쪽(이름 · 가격) · 오른쪽(버튼 · 범위 + 통계) — 좁으면 오른쪽이 그 줄 아래로 접힌다 */
export const head = style({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  minWidth: 0,
  padding: "4px 4px 0",
});

export const headRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px 24px",
  flexWrap: "wrap",
  minWidth: 0,
});

/** 1줄 오른쪽 — [더 보기] · [주문 전 체크] */
export const actions = style({ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 });

export const nameRow = style({ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", minWidth: 0 });

export const name = style({
  margin: 0,
  fontSize: vars.deskType.section.fontSize,
  lineHeight: vars.deskType.section.lineHeight,
  fontWeight: vars.fontWeights.bold,
  color: vars.colors.desk.text1,
  whiteSpace: "nowrap",
});

export const code = style({
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text2,
  fontVariantNumeric: "tabular-nums",
});

/** 시장 칩 — 옅은 면 · 12/500 2단 */
export const chip = style({
  display: "inline-flex",
  alignItems: "center",
  height: "20px",
  padding: "0 6px",
  borderRadius: "6px",
  background: SURFACE.weakFill,
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
});

export const priceRow = style({ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap", minWidth: 0 });

/** 가격 — 상세 머리 한 곳만 24/700(우리 화면의 주인공) */
export const price = style({
  position: "relative",
  fontSize: vars.deskType.price.fontSize,
  lineHeight: vars.deskType.price.lineHeight,
  fontWeight: vars.deskType.price.fontWeight,
  color: vars.colors.desk.text1,
  fontVariantNumeric: "tabular-nums",
  letterSpacing: "-0.01em",
});

/** 등락 13/500 — 머리 등락 색은 정해 둔 값(`special.up` · `down`, 국내 `KrChangeText` 와 같다)이라 그대로. 부호도 글자로 준다 */
export const change = styleVariants({
  up: { color: vars.colors.special.up },
  down: { color: vars.colors.special.down },
  flat: { color: vars.colors.desk.text2 },
});
export const changeText = style({
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.fontWeights.medium,
  fontVariantNumeric: "tabular-nums",
});

/** 오른쪽 묶음 — 범위 막대 · 통계 · 버튼. 좁으면 아래 줄로 내려간다 */
export const side = style({
  display: "flex",
  alignItems: "center",
  gap: "8px 24px",
  flexWrap: "wrap",
  minWidth: 0,
});

export const stats = style({ display: "flex", alignItems: "center", gap: "20px", margin: 0, flexWrap: "wrap" });

export const stat = style({ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0, margin: 0 });

export const statLabel = style({
  margin: 0,
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
  whiteSpace: "nowrap",
});

export const statValue = style({
  margin: 0,
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text1,
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
});

/* ── 범위 막대(1일 · 52주) ─────────────────────────────────────── */

export const range = style({ display: "flex", flexDirection: "column", gap: "4px", minWidth: "128px" });

export const rangeEnds = style([
  statLabel,
  { display: "flex", justifyContent: "space-between", gap: "8px", fontVariantNumeric: "tabular-nums" },
]);

/** 막대 — 표시 기하일 뿐 금액이 아니다. 3단 색은 비글자라 된다 */
export const rangeTrack = style({
  position: "relative",
  height: "4px",
  borderRadius: "2px",
  background: vars.colors.desk.line,
});

export const rangeDot = style({
  position: "absolute",
  top: "50%",
  width: "8px",
  height: "8px",
  marginLeft: "-4px",
  marginTop: "-4px",
  borderRadius: "50%",
  background: vars.colors.desk.text1,
});

/* ── 버튼(더 보기 · 주문 전 체크) ───────────────────────────────── */

/** 보조 버튼 — 32 · 모서리 8 · 13/600, 옅은 면(주 버튼은 화면당 하나 — 여기 두지 않는다) */
export const headButton = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  height: "32px",
  padding: "0 10px",
  border: 0,
  borderRadius: "8px",
  background: SURFACE.weakFill,
  color: vars.colors.desk.text1,
  fontFamily: "inherit",
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  textDecoration: "none",
  whiteSpace: "nowrap",
  cursor: "pointer",
  // 호버 면 · 누름 0.97(`@repo/ui` 누름 피드백 — FE-REQ-044 FR-30)
  transition: `background-color ${vars.motion.duration.instant}, ${PRESS_TRANSITION}`,
  ...pressReducedMotion,
  selectors: {
    [PRESS_SELECTOR]: pressActive,
    "&:hover": { background: vars.colors.desk.line },
    "&:focus-visible": { outline: `2px solid ${vars.colors.border.focus}`, outlineOffset: "2px" },
  },
});

/** 국내 머리 아래 덧줄(시간외 · 시장 조치 · 정지) — 있을 때만 */
export const notes = style({ display: "flex", flexDirection: "column", gap: "6px", padding: "0 4px" });

export const noteLine = style({
  margin: 0,
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
});

/* ── [더 보기] 팝오버 ─────────────────────────────────────────── */

export const moreWrap = style({ position: "relative" });

const popIn = keyframes({
  from: { opacity: 0, transform: "translateY(-4px) scale(0.98)" },
  to: { opacity: 1, transform: "none" },
});

/** 팝오버 — 메뉴 · 팝오버만 그림자(`screen-desktop.md` §3) */
export const morePop = style({
  position: "absolute",
  top: "calc(100% + 6px)",
  right: 0,
  zIndex: 20,
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(112px, max-content))",
  gap: "12px 24px",
  margin: 0,
  padding: "16px",
  borderRadius: "12px",
  background: vars.colors.background.white,
  boxShadow: `${SURFACE.hairline}, ${vars.elevation.md}`,
  // 열릴 때 버튼 쪽(위)에서 4px 내려오며 나타난다 — 투명도 · transform 만(`motion.md` §4 · §5)
  transformOrigin: "top right",
  animation: `${popIn} ${vars.motion.duration.base} ${vars.motion.easing.enter} both`,
  // 좁은 폭(앱 웹뷰)은 버튼이 줄 왼쪽에 오므로 왼쪽에 맞춘다 — 오른쪽 맞춤이면 화면 왼쪽 밖으로 나간다
  "@media": {
    "screen and (max-width: 767px)": { right: "auto", left: 0, transformOrigin: "top left" },
    "(prefers-reduced-motion: reduce)": { animation: "none" },
  },
});

/** [더 보기] 꺾쇠 — 열리면 반 바퀴(뜻: 펼침 ↔ 접힘) */
export const moreChevron = style({
  transition: `transform ${vars.motion.duration.base} ${vars.motion.easing.move}`,
  selectors: { '[aria-expanded="true"] > &': { transform: "rotate(180deg)" } },
  "@media": { "(prefers-reduced-motion: reduce)": { transition: "none" } },
});

/** 가격이 바뀔 때 밑줄이 한 번 스친다(2026-09-23 결정 그대로) — 오른 쪽 색. `opacity` 만 움직인다 */
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

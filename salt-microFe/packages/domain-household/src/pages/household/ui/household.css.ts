import { style } from "@vanilla-extract/css";

import { IN_APP_WEBVIEW } from "@repo/core/embed";
import { enterReveal } from "@repo/ui/enterReveal";
import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@repo/web-shared/ui/surface.css";

/**
 * 가계부 데스크톱 화면(`FE-REQ-060` FR-1~6 · FR-12). 틀은 `PageFrame`(바탕 · 패널 · 사이드 312). 면은 패널 + 정보 상자 둘뿐.
 * 1280 이상: 쓴 내역 | 달력(360) 두 칸 · 1024~1279: 달력이 목록 아래로 · 사이드는 1024 이상(태블릿은 본문 아래 — PageFrame)
 */
const WIDE = "screen and (min-width: 1280px)";
const DESKTOP = "screen and (min-width: 1024px)";

const title = {
  margin: 0,
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text1,
} as const;
const label = {
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
} as const;

/* ── 달 이동(FR-5) — `‹ 2026년 11월 ›` + "이번 달" ─────────────── */
export const monthNav = style({ display: "flex", alignItems: "center", gap: "4px" });
export const monthLabel = style({ ...title, fontSize: vars.deskType.section.fontSize, minWidth: "96px", textAlign: "center", fontVariantNumeric: "tabular-nums" });
export const navButton = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "32px",
  height: "32px",
  borderRadius: "8px",
  color: vars.colors.desk.text1,
  fontSize: vars.deskType.title.fontSize,
  lineHeight: vars.deskType.title.lineHeight,
  textDecoration: "none",
  transition: `background-color ${vars.motion.duration.instant}`,
  ":hover": { background: vars.colors.desk.line },
  ":focus-visible": { outline: `2px solid ${vars.colors.border.focus}`, outlineOffset: "2px" },
});
export const navDisabled = style([navButton, { color: vars.colors.desk.nonText3, pointerEvents: "none" }]);
export const textButton = style({
  ...label,
  display: "inline-flex",
  alignItems: "center",
  height: "32px",
  padding: "0 10px",
  borderRadius: "8px",
  color: vars.colors.desk.text1,
  fontWeight: vars.deskType.body.fontWeight,
  textDecoration: "none",
  ":hover": { background: vars.colors.desk.line },
  ":focus-visible": { outline: `2px solid ${vars.colors.border.focus}`, outlineOffset: "2px" },
});

/* ── 본문 ─────────────────────────────────────────────────── */
export const board = style({ display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 });
export const description = style({ ...label, margin: 0 });

/** 1024 미만 · 앱 웹뷰 — 사이드가 없거나 아래라 도구 링크를 본문 위에 한 줄로 */
export const toolsInline = style({
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  "@media": { [DESKTOP]: { display: "none" } },
  selectors: { [IN_APP_WEBVIEW]: { display: "flex" } },
});
export const chipLink = style({
  ...label,
  display: "inline-flex",
  alignItems: "center",
  height: "32px",
  padding: "0 12px",
  borderRadius: "8px",
  background: SURFACE.weakFill,
  color: vars.colors.desk.text1,
  fontWeight: vars.deskType.body.fontWeight,
  textDecoration: "none",
  whiteSpace: "nowrap",
});

export const asks = style({ display: "flex", flexDirection: "column", gap: "12px", minWidth: 0, selectors: { "&:empty": { display: "none" } } });

export const split = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "24px",
  alignItems: "start",
  "@media": { [WIDE]: { gridTemplateColumns: "minmax(0, 1fr) 360px" } },
});

export const section = style({ display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 });
export const sectionHead = style({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", minHeight: "32px" });
export const sectionTitle = style(title);
export const hint = style({ ...label, margin: 0 });

/** 고른 날 칸 — 정보 상자. 날을 바꾸면 새 칸이 8px 아래에서 올라온다(`key` = 날짜, 블록 등장 장치 — `motion.md` §1) */
export const dayDetail = style({
  ...enterReveal,
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  padding: "12px",
  borderRadius: "12px",
  background: SURFACE.infoFill,
  boxShadow: `inset 0 0 0 1px ${vars.colors.desk.line}`,
});
export const dayHead = style({ ...title, display: "flex", justifyContent: "space-between", gap: "8px", fontVariantNumeric: "tabular-nums" });

export const moreGrid = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "12px",
  alignItems: "start",
  "@media": { [WIDE]: { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" } },
});

/* ── 사이드 ───────────────────────────────────────────────── */
export const sideBlock = style({ display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 });
export const sideHead = style({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" });
export const sideTitle = style(title);
export const sideLink = style({ ...label, color: vars.colors.desk.text1, fontWeight: vars.deskType.body.fontWeight, textDecoration: "none", ":hover": { textDecoration: "underline" } });
export const dayRows = style({ display: "flex", flexDirection: "column", margin: 0, padding: 0, listStyle: "none" });

/** 한 줄 상태(FR-13) — 실패 + 다시 불러오기 · 빈 목록은 쓴 내역 칸 높이를 조금 지킨다 */
export const statusRow = style({ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", minHeight: "120px" });
export const emptyRow = style({ display: "flex", alignItems: "center", minHeight: "96px", padding: "0 8px" });

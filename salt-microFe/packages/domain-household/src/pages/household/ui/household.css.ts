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

/**
 * 2026-11-20 가계부 개편 — 본문 칸을 흰 카드로(차트 두 칸 · 쓴 내역). 카드 = 흰 면 · 모서리 12 · 안쪽 선, 그림자 없음(`screen-desktop.md` §3)
 */
export const card = style({
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  minWidth: 0,
  padding: "16px 20px 20px",
  borderRadius: "12px",
  background: vars.colors.background.white,
  boxShadow: SURFACE.hairline,
});

/** 차트 두 칸 — 날마다(넓게) · 분류. 1280 미만은 위아래 */
export const chartRow = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "16px",
  alignItems: "stretch",
  "@media": { [WIDE]: { gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)" } },
  selectors: { [IN_APP_WEBVIEW]: { gridTemplateColumns: "minmax(0, 1fr)" } },
});

/** 달력 보기 — 달력 | 고른 날 */
export const calendarSplit = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "20px",
  alignItems: "start",
  "@media": { [WIDE]: { gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" } },
});

export const emptyLine = style({ ...label, margin: 0, padding: "24px 8px" });

/** 지출 없는 달 — 안내 | 예시 */
export const startCard = style([
  card,
  {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: "24px",
    padding: "24px",
    alignItems: "center",
    "@media": { [WIDE]: { gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" } },
  },
]);

export const startText = style({ display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 });

export const startTitle = style({
  margin: 0,
  fontSize: vars.deskType.title.fontSize,
  lineHeight: vars.deskType.title.lineHeight,
  fontWeight: vars.deskType.title.fontWeight,
  color: vars.colors.desk.text1,
});

export const startActions = style({ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" });

const linkButton = {
  display: "inline-flex",
  alignItems: "center",
  height: "36px",
  padding: "0 14px",
  borderRadius: "8px",
  fontSize: vars.deskType.section.fontSize,
  fontWeight: vars.deskType.section.fontWeight,
  textDecoration: "none",
} as const;

/** 화면당 주 버튼 하나 — 지출 적기 */
export const primaryLink = style({
  ...linkButton,
  background: vars.colors.brand.primary,
  color: vars.colors.background.white,
  selectors: { "&:hover": { background: vars.colors.brand.hover }, "&:focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "2px" } },
});

export const weakLink = style({
  ...linkButton,
  background: vars.colors.neutral[100],
  color: vars.colors.desk.text1,
  selectors: { "&:hover": { background: vars.colors.neutral[200] }, "&:focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "2px" } },
});

export const sample = style({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  padding: "16px",
  borderRadius: "12px",
  background: SURFACE.infoFill,
  boxShadow: `inset 0 0 0 1px ${vars.colors.desk.line}`,
});

export const sampleHead = style({ display: "flex", alignItems: "center", justifyContent: "space-between" });

export const sampleBadge = style({
  padding: "0 6px",
  borderRadius: "6px",
  background: vars.colors.neutral[100],
  fontSize: vars.deskType.label.fontSize,
  lineHeight: "20px",
  color: vars.colors.desk.text2,
});

export const sampleBars = style({ display: "flex", alignItems: "flex-end", gap: "3px", height: "96px", boxShadow: `inset 0 -1px 0 ${vars.colors.desk.line}` });
export const sampleBar = style({ flex: 1, maxWidth: "14px", borderRadius: "3px 3px 0 0", background: vars.colors.neutral[200] });
export const sampleDot = style({ flex: 1, maxWidth: "14px", height: "4px", borderRadius: "999px", background: vars.colors.neutral[200] });

/** 사이드 도구 접기 — 오른쪽 셰브론, 열리면 아래로(2026-11-20) */
export const sideFold = style({ display: "flex", flexDirection: "column", gap: "4px" });
export const sideFoldSummary = style({
  ...title,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  minHeight: "36px",
  padding: "0 4px",
  borderRadius: "8px",
  cursor: "pointer",
  listStyle: "none",
  selectors: {
    "&::-webkit-details-marker": { display: "none" },
    "&::after": {
      content: '""',
      width: "7px",
      height: "7px",
      borderRight: `1.5px solid ${vars.colors.desk.text2}`,
      borderBottom: `1.5px solid ${vars.colors.desk.text2}`,
      transform: "rotate(-45deg)",
      transition: `transform ${vars.motion.duration.instant}`,
    },
    "details[open] > &::after": { transform: "rotate(45deg)" },
    "&:hover": { background: "rgba(7, 25, 76, 0.04)" },
    "&:focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "2px" },
  },
});

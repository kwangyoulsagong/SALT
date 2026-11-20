import { style } from "@vanilla-extract/css";

import { IN_APP_WEBVIEW } from "@repo/core/embed";
import { enterReveal } from "@repo/ui/enterReveal";
import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@repo/web-shared/ui/surface.css";

/**
 * 저축 목표 데스크톱 화면(`FE-REQ-060` FR-1 · 8 · 12). 틀은 `PageFrame`(바탕 · 패널 · 사이드 312). 면은 패널 + 정보 상자 둘뿐.
 * 1280 이상: 목록 | 미리보기(360) 두 칸 · 1280 미만: 미리보기가 목록 아래로 · 사이드는 1024 이상(태블릿은 본문 아래 — PageFrame)
 */
const WIDE = "screen and (min-width: 1280px)";

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

/** 새 목표 — 머리 오른쪽 작은 링크(32 높이 · 14/600 · 모서리 8, `screen-desktop.md` §3 버튼 값). 주 버튼은 미리보기 칸의 넣기 하나 */
export const addLink = style({
  display: "inline-flex",
  alignItems: "center",
  height: "32px",
  padding: "0 12px",
  borderRadius: "8px",
  background: SURFACE.weakFill,
  color: vars.colors.desk.text1,
  fontSize: vars.deskType.section.fontSize,
  lineHeight: vars.deskType.section.lineHeight,
  fontWeight: vars.deskType.section.fontWeight,
  textDecoration: "none",
  whiteSpace: "nowrap",
  // 앱 웹뷰 터치 대상 44(`FE-REQ-060` FR-M5)
  selectors: { [IN_APP_WEBVIEW]: { height: "44px" } },
  transition: `background-color ${vars.motion.duration.instant}`,
  ":hover": { background: vars.colors.desk.line },
  ":focus-visible": { outline: `2px solid ${vars.colors.border.focus}`, outlineOffset: "2px" },
});

/* ── 본문 ─────────────────────────────────────────────────── */
export const board = style({ display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 });
export const description = style({ ...label, margin: 0 });

export const split = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "24px",
  alignItems: "start",
  "@media": { [WIDE]: { gridTemplateColumns: "minmax(0, 1fr) 360px" } },
});

export const section = style({ display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 });
export const sectionHead = style({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", minHeight: "32px" });
export const sectionTitle = style({
  ...title,
  // 앱 웹뷰 섹션 머리 = `t5`(`screen-mobile.md` §3)
  selectors: {
    [IN_APP_WEBVIEW]: { fontSize: vars.appType.body.fontSize, lineHeight: vars.appType.body.lineHeight, fontWeight: vars.appType.body.fontWeight, color: vars.colors.text.primary },
  },
});
// 앱 웹뷰 글자 13 이상(`RN-REQ-032` FR-7 · `FE-REQ-060` FR-M)
export const hint = style({ ...label, margin: 0, selectors: { [IN_APP_WEBVIEW]: { fontSize: vars.appType.caption.fontSize, lineHeight: vars.appType.caption.lineHeight } } });

/** 미리보기 칸 — 정보 상자. 목표를 바꾸면 새 칸이 8px 아래에서 올라온다(`motion.md` §1 블록 등장) */
export const preview = style({
  ...enterReveal,
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  padding: "16px",
  borderRadius: "12px",
  background: SURFACE.infoFill,
  boxShadow: SURFACE.hairline,
});
export const previewHead = style({ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px" });
export const previewTitle = style({ ...title, fontSize: vars.deskType.section.fontSize, lineHeight: vars.deskType.section.lineHeight });
export const detailLink = style({
  ...label,
  flexShrink: 0,
  color: vars.colors.desk.text1,
  fontWeight: vars.deskType.body.fontWeight,
  textDecoration: "none",
  ":hover": { textDecoration: "underline" },
  ":focus-visible": { outline: `2px solid ${vars.colors.border.focus}`, outlineOffset: "2px", borderRadius: "4px" },
});
export const lead = style({ display: "flex", flexDirection: "column", gap: "2px" });
export const leadValue = style({
  fontSize: vars.deskType.title.fontSize,
  lineHeight: vars.deskType.title.lineHeight,
  fontWeight: vars.deskType.title.fontWeight,
  color: vars.colors.desk.text1,
  fontVariantNumeric: "tabular-nums",
});
export const depositBlock = style({ display: "flex", flexDirection: "column", paddingTop: "4px", borderTop: `1px solid ${vars.colors.desk.line}` });

/** 앱 웹뷰 — 사이드 도구를 본문 아래에 */
export const inlineTools = style({ display: "flex", flexDirection: "column", gap: "16px", paddingTop: "8px", borderTop: `1px solid ${vars.colors.desk.line}` });

/* ── 사이드 ───────────────────────────────────────────────── */
export const sideBlock = style({ display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 });
export const sideTitle = style(title);
export const fold = style({ display: "flex", flexDirection: "column", gap: "8px" });
export const foldSummary = style({
  ...title,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  minHeight: "32px",
  borderRadius: "8px",
  cursor: "pointer",
  listStyle: "none",
  padding: "0 4px",
  selectors: {
    // 앱 웹뷰 — 목록 아래 섹션 행(셰브론 · 44, FR-M2 · M5). 펼치면 같은 폼
    [IN_APP_WEBVIEW]: { minHeight: "48px", fontSize: vars.appType.body.fontSize, lineHeight: vars.appType.body.lineHeight, color: vars.colors.text.primary },
    "&::-webkit-details-marker": { display: "none" },
    // 펼칠 수 있다는 표지 — 오른쪽 셰브론, 열리면 아래로(2026-11-20 도구 접기)
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
  },
  ":focus-visible": { outline: `2px solid ${vars.colors.border.focus}`, outlineOffset: "2px" },
});

/** 한 줄 상태(FR-13) — 실패 + 다시 불러오기 · 빈 목록은 칸 높이를 조금 지킨다 */
export const statusRow = style({ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", minHeight: "120px" });
export const emptyRow = style({ display: "flex", alignItems: "center", minHeight: "96px", padding: "0 8px" });

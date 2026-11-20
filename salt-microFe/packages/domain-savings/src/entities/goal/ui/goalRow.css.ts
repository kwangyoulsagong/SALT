import { style } from "@vanilla-extract/css";

import { ON_MOBILE } from "@repo/core/mobile";
import { vars } from "@repo/ui/tokens";

/**
 * 목표 목록 행(`FE-REQ-060` FR-3) — 보조 줄 있는 행 56 · 호버 면 모서리 8 · 고른 행 = 같은 면(보라 0, 표 선택 보라 금지 결정).
 * 글자는 데스크톱 4단 토큰만
 */
const label = {
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
} as const;

export const row = style({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  width: "100%",
  minHeight: "56px",
  padding: "8px",
  border: "none",
  borderRadius: "8px",
  background: "transparent",
  color: "inherit",
  font: "inherit",
  textAlign: "left",
  cursor: "pointer",
  transition: `background-color ${vars.motion.duration.instant}, transform ${vars.motion.duration.instant}`,
  selectors: {
    "&:hover": { background: vars.colors.desk.line },
    '&[aria-current="true"]': { background: vars.colors.desk.line },
    "&:active": { transform: "scale(0.99)" },
    // 휴대폰(`/m`) 목록 행 — 세로 여백 12 · 호버 면 없음 · 누르면 상세로(FR-M2). 글자를 키우면 금액이 다음 줄로(FR-M4)
    [ON_MOBILE]: { padding: "12px 4px", flexWrap: "wrap", background: "transparent" },
  },
  ":focus-visible": { outline: `2px solid ${vars.colors.border.focus}`, outlineOffset: "-2px" },
  "@media": { "(prefers-reduced-motion: reduce)": { transition: "none", selectors: { "&:active": { transform: "none" } } } },
});

export const plate = style({
  ...label,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  width: "32px",
  height: "32px",
  borderRadius: "8px",
  // 저축 도메인 색 옅은 판 + 템플릿 선 아이콘(2026-11-20 — 글자 한 자 판이 밋밋했다). 도메인 색은 작은 표지에만
  background: "rgba(9, 146, 104, 0.1)",
  color: vars.colors.domain.savings,
  // 휴대폰(`/m`) 목록 왼쪽 그림 = 원 40(`screen-mobile.md` §3)
  selectors: { [ON_MOBILE]: { width: "40px", height: "40px", borderRadius: "999px" } },
});

export const main = style({ display: "flex", flexDirection: "column", gap: "4px", flex: 1, minWidth: 0, selectors: { [ON_MOBILE]: { flex: "1 1 96px" } } });

export const title = style({
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  selectors: {
    [ON_MOBILE]: { fontSize: vars.appType.body.fontSize, lineHeight: vars.appType.body.lineHeight, fontWeight: vars.appType.body.fontWeight, color: vars.colors.text.primary },
  },
});

export const caption = style({
  ...label,
  overflowWrap: "anywhere",
  selectors: {
    [ON_MOBILE]: { fontSize: vars.appType.caption.fontSize, lineHeight: vars.appType.caption.lineHeight, fontWeight: vars.appType.caption.fontWeight, color: vars.colors.text.tertiary },
  },
});

/** 진척 막대 4 — 길이는 `scaleX`(레이아웃 속성을 바꾸지 않는다) */
export const bar = style({ display: "block", width: "100%", maxWidth: "240px", height: "4px", borderRadius: "999px", background: vars.colors.desk.line, overflow: "hidden" });
export const barFill = style({ display: "block", width: "100%", height: "100%", background: vars.colors.domain.savings, transformOrigin: "left center" });

export const side = style({ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px", flexShrink: 0, textAlign: "right", selectors: { [ON_MOBILE]: { marginLeft: "auto" } } });

export const amount = style({
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text1,
  fontVariantNumeric: "tabular-nums",
  selectors: {
    [ON_MOBILE]: { fontSize: vars.appType.body.fontSize, lineHeight: vars.appType.body.lineHeight, fontWeight: "700", color: vars.colors.text.primary, overflowWrap: "anywhere" },
  },
});

export const rows = style({ display: "flex", flexDirection: "column", margin: 0, padding: 0, listStyle: "none" });

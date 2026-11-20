import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 휴대폰 목표 상세(`FE-REQ-072`) — 한 열 · 글자 `appType` 만 · 누름 칸 44 이상 */
export const muted = style({
  margin: 0,
  fontSize: vars.appType.caption.fontSize,
  lineHeight: vars.appType.caption.lineHeight,
  color: vars.colors.text.tertiary,
});

export const value = style({
  fontSize: vars.appType.desc.fontSize,
  lineHeight: vars.appType.desc.lineHeight,
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.primary,
  fontVariantNumeric: "tabular-nums",
});

export const amount = style([value, { marginLeft: "auto", textAlign: "right", fontSize: vars.appType.body.fontSize, lineHeight: vars.appType.body.lineHeight }]);

export const textLink = style({
  display: "inline-flex",
  alignItems: "center",
  alignSelf: "flex-start",
  minHeight: "44px",
  color: vars.colors.brand.primary,
  fontSize: vars.appType.body.fontSize,
  fontWeight: vars.fontWeights.semibold,
  textDecoration: "none",
});

export const planRow = style({ display: "flex", alignItems: "center", gap: vars.space.lg, minWidth: 0 });
export const planText = style({ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 });

/** 상태 셋 — 한 열로 쌓는다 */
export const cells = style({ display: "flex", flexDirection: "column", gap: vars.space.md, minWidth: 0 });

export const rows = style({ display: "flex", flexDirection: "column", margin: 0, padding: 0, listStyle: "none" });
export const row = style({ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px 12px", padding: "12px 0" });
export const rowMain = style({ display: "flex", flexDirection: "column", gap: "2px", flex: "1 1 128px", minWidth: 0 });

export const folds = style({ display: "flex", flexDirection: "column" });
export const fold = style({ display: "flex", flexDirection: "column", gap: vars.space.sm, paddingBottom: vars.space.sm });

/** 접힘 머리 — 섹션 행 48 · `t5` · 오른쪽 셰브론(열리면 아래) */
export const foldSummary = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  minHeight: "48px",
  cursor: "pointer",
  listStyle: "none",
  fontSize: vars.appType.body.fontSize,
  lineHeight: vars.appType.body.lineHeight,
  color: vars.colors.text.primary,
  selectors: {
    "&::-webkit-details-marker": { display: "none" },
    "&::after": {
      content: '""',
      width: "7px",
      height: "7px",
      marginRight: "4px",
      borderRight: `1.5px solid ${vars.colors.neutral[500]}`,
      borderBottom: `1.5px solid ${vars.colors.neutral[500]}`,
      transform: "rotate(-45deg)",
      transition: `transform ${vars.motion.duration.instant}`,
    },
    "details[open] > &::after": { transform: "rotate(45deg)" },
  },
  ":focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "2px" },
});

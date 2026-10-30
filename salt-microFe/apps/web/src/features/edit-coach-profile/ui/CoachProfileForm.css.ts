import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 내 기준 폼(`set-risk-budget`)과 같은 실측 행 — 라벨 열은 문구가 길어 120px · 입력 32px · 13px */
export const form = style({ display: "flex", flexDirection: "column", gap: vars.space.md, fontFamily: vars.fontFamily.base });

export const row = style({
  display: "grid",
  gridTemplateColumns: "120px minmax(0, 1fr)",
  alignItems: "start",
  columnGap: vars.space.sm,
  rowGap: "4px",
  maxWidth: "560px",
  "@media": { "screen and (max-width: 640px)": { gridTemplateColumns: "minmax(0, 1fr)" } },
});

export const label = style({
  paddingTop: "6px",
  color: "rgba(24, 31, 43, 0.77)",
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.medium,
});

export const field = style({ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px", minWidth: 0 });

/** 시간 칸은 세 자리면 충분하다 — 넓은 칸에 숫자 하나가 떠 있지 않게 */
export const hoursField = style({ width: "140px", maxWidth: "100%" });

export const unit = style({ color: "rgba(26, 31, 41, 0.89)", fontSize: "13px", fontWeight: vars.fontWeights.medium });

export const hint = style({ margin: 0, maxWidth: "720px", color: vars.colors.neutral[600], fontSize: "12px", lineHeight: "18px" });

export const actions = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: vars.space.sm });

/** 주 버튼 — 내 기준 폼과 같은 32h · 모서리 7 · 13/600 */
export const primaryButton = style({
  height: "32px",
  padding: "0 12px",
  border: "none",
  borderRadius: "7px",
  background: vars.colors.text.primary,
  color: vars.colors.text.white,
  fontSize: "13px",
  fontWeight: vars.fontWeights.semibold,
  cursor: "pointer",
  selectors: {
    "&:hover": { background: vars.colors.neutral[800] },
    "&:focus-visible": { outline: `2px solid ${vars.colors.neutral[800]}`, outlineOffset: "2px" },
    "&:disabled": { cursor: "not-allowed", opacity: 0.5 },
  },
});

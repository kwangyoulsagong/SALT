import { style } from "@vanilla-extract/css";

import { ON_MOBILE } from "@repo/core/mobile";
import { vars } from "@repo/ui/tokens";

/** 해설 상자 위 날짜 줄 — 라벨 단 12/500(휴대폰 13) · 2단 글자색. 버튼은 투명 · 호버 때만 면(전역 `:where()` 전환) */
export const days = style({ display: "flex", flexDirection: "column", gap: "8px" });

export const nav = style({ display: "flex", alignItems: "center", gap: "4px" });

export const navButton = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "28px",
  height: "28px",
  padding: "0 6px",
  border: 0,
  borderRadius: "7px",
  background: "transparent",
  color: vars.colors.neutral[700],
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  cursor: "pointer",
  selectors: {
    "&:hover:not(:disabled)": { background: vars.colors.neutral[100] },
    "&:disabled": { cursor: "default", opacity: 0.4 },
    // 누름 칸 44(`mobile-design.md` §5)
    [ON_MOBILE]: { minWidth: "44px", height: "44px" },
  },
});

export const dayLabel = style({
  minWidth: "64px",
  textAlign: "center",
  fontSize: "12px",
  lineHeight: "16px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.primary,
  fontVariantNumeric: "tabular-nums",
  selectors: { [ON_MOBILE]: { fontSize: "13px" } },
});

const note = {
  margin: 0,
  fontSize: "12px",
  lineHeight: "16px",
  fontWeight: vars.fontWeights.medium,
  color: vars.colors.neutral[700],
  selectors: { [ON_MOBILE]: { fontSize: "13px", lineHeight: "20px" } },
} as const;

export const hint = style([note, { marginLeft: "4px" }]);
export const asOf = style(note);

/** 그날 판정 · 그날 · 그 뒤 — 칩 셋 한 줄(좁으면 줄바꿈). 숫자는 고정폭 */
export const outcome = style({ display: "flex", flexWrap: "wrap", gap: "6px", margin: 0, padding: 0, listStyle: "none" });
export const outcomeItem = style({
  padding: "2px 8px",
  borderRadius: "7px",
  background: vars.colors.background.white,
  fontSize: "12px",
  lineHeight: "18px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.primary,
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
  selectors: { [ON_MOBILE]: { fontSize: "13px", lineHeight: "20px" } },
});
export const up = style({ color: vars.colors.special.up });
export const down = style({ color: vars.colors.special.down });

export const backToToday = style([
  note,
  {
    alignSelf: "flex-start",
    padding: 0,
    border: 0,
    background: "transparent",
    color: vars.colors.text.secondary,
    textDecoration: "underline",
    textUnderlineOffset: "2px",
    cursor: "pointer",
    selectors: { [ON_MOBILE]: { minHeight: "44px" } },
  },
]);

import { style } from "@vanilla-extract/css";
import { vars } from "@repo/ui/tokens";

/**
 * 오른쪽 상자 — 참고 화면 일정 상자 자리(옅은 바탕 · 둥근 모서리 · 제목 13 · 목록 세 줄).
 * 세로 배분: 14 + 머리 20 + 10 + 수 칸 34 + 6 + 막대 4 + 10 + 구분선 + 10 + 목록 60 + 14 ≈ 174 ≤ 띠 176
 */
export const panel = style({
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  height: "100%",
  padding: "14px 16px",
  borderRadius: vars.radius.large,
  backgroundColor: vars.colors.neutral[50],
  overflow: "hidden",
});

export const header = style({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: vars.space.sm,
});

export const title = style({
  margin: 0,
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.primary,
});

export const caption = style({
  fontSize: vars.fontSizes.sm,
  lineHeight: "16px",
  color: vars.colors.text.tertiary,
});

/** 상승 · 보합 · 하락 세 칸 — 이름 12 회색 위, 수 14 굵게 아래(대표 칸 아래 줄과 같은 문법) */
export const counts = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  marginTop: "10px",
});

export const countLabel = style({
  display: "block",
  fontSize: vars.fontSizes.sm,
  lineHeight: "16px",
  color: vars.colors.text.tertiary,
});

export const countValue = style({
  display: "block",
  fontSize: vars.fontSizes.base,
  lineHeight: "18px",
  fontWeight: vars.fontWeights.semibold,
  fontVariantNumeric: "tabular-nums",
});

export const up = style({ color: vars.colors.special.up });
export const flat = style({ color: vars.colors.text.lightGray });
export const down = style({ color: vars.colors.special.down });

/** 얇은 막대 — 칸 폭은 `flex-grow` = 종목 수(비율 계산 없음) */
export const bar = style({
  display: "flex",
  gap: "2px",
  height: "4px",
  marginTop: "6px",
  borderRadius: vars.radius.full,
  overflow: "hidden",
  flexShrink: 0,
});

const segment = style({ flexBasis: 0, minWidth: "2px" });
export const segmentUp = style([segment, { backgroundColor: vars.colors.special.up }]);
export const segmentFlat = style([segment, { backgroundColor: vars.colors.neutral[300] }]);
export const segmentDown = style([segment, { backgroundColor: vars.colors.special.down }]);

export const list = style({
  margin: "10px 0 0",
  padding: "10px 0 0",
  listStyle: "none",
  borderTop: `1px solid ${vars.colors.border.light}`,
});

export const row = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  height: "20px",
  margin: 0,
});

export const link = style({
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "13px",
  color: vars.colors.text.primary,
  textDecoration: "none",
  selectors: {
    "&:hover": { textDecoration: "underline" },
    "&:focus-visible": {
      outline: `2px solid ${vars.colors.border.focus}`,
      outlineOffset: "1px",
    },
  },
});

export const time = style({
  flexShrink: 0,
  fontSize: vars.fontSizes.sm,
  color: vars.colors.text.tertiary,
  fontVariantNumeric: "tabular-nums",
});

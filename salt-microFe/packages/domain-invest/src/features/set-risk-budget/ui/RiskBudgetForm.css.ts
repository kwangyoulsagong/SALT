import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 거래 기록 폼과 같은 실측 행(라벨 열 약 90px — 라벨이 더 길다 · 입력 32px · 13px). 패널 안 한 묶음 */
export const form = style({ display: "flex", flexDirection: "column", gap: vars.space.sm, fontFamily: vars.fontFamily.base });

export const rows = style({
  display: "grid",
  gridTemplateColumns: "90px minmax(0, 1fr)",
  alignItems: "center",
  columnGap: vars.space.sm,
  rowGap: vars.space.sm,
  maxWidth: "480px",
});

/** 금액 칸 + 원/% 고르기. 좁으면 고르기가 아래로 내려간다(200% 확대) */
export const fieldWithUnit = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px", minWidth: 0 });

/** 칸이 남는 폭을 가져가되 고르기를 밀어내지 않는다 — 200% 확대에서만 고르기가 아래로 */
export const fieldGrow = style({ flex: "1 1 160px", minWidth: 0 });

export const intro = style({
  margin: 0,
  color: vars.colors.text.primary,
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
});

export const label = style({
  color: "rgba(24, 31, 43, 0.77)",
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.medium,
});

export const unit = style({ color: "rgba(26, 31, 41, 0.89)", fontSize: "13px", fontWeight: vars.fontWeights.medium });

export const hint = style({ margin: 0, color: vars.colors.neutral[600], fontSize: "12px", lineHeight: "18px" });

export const actions = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: vars.space.sm, fontFamily: vars.fontFamily.base });

/** 옅은 회색 면 버튼 — 실측 28h · 모서리 7 · 13/600, 세로 여백으로 44 터치 타깃 */
export const weakButton = style({
  height: "32px",
  padding: "0 12px",
  border: "none",
  borderRadius: "7px",
  background: "rgba(7, 25, 76, 0.04)",
  color: "rgba(26, 31, 41, 0.89)",
  fontSize: "13px",
  fontWeight: vars.fontWeights.semibold,
  cursor: "pointer",
  selectors: {
    "&:hover": { background: vars.colors.neutral[100] },
    "&:focus-visible": { outline: `2px solid ${vars.colors.neutral[800]}`, outlineOffset: "2px" },
    "&:disabled": { cursor: "not-allowed", opacity: 0.5 },
  },
});

export const primaryButton = style([
  weakButton,
  {
    background: vars.colors.text.primary,
    color: vars.colors.text.white,
    selectors: { "&:hover": { background: vars.colors.neutral[800] } },
  },
]);

export const statusText = style({ margin: 0, fontSize: "12px", lineHeight: "18px", color: vars.colors.text.secondary });
export const errorText = style({ margin: 0, fontSize: "12px", lineHeight: "18px", color: vars.colors.status.errorDark });

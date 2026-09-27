import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 청산 줄 안에서 펼치는 태그 고르기 — 모달 없이 그 자리. 거래 폼과 같은 조밀형(13px · 32px 버튼) */
export const editor = style({ display: "flex", flexDirection: "column", gap: vars.space.sm, fontFamily: vars.fontFamily.base });

export const fieldset = style({ margin: 0, padding: 0, border: "none", display: "flex", flexDirection: "column", gap: "6px" });

export const legend = style({
  padding: 0,
  color: vars.colors.neutral[700],
  fontSize: "12px",
  lineHeight: "18px",
  fontWeight: vars.fontWeights.semibold,
});

export const options = style({ display: "flex", flexWrap: "wrap", gap: "6px" });

/**
 * 체크박스 알약. 선택은 테두리 굵기 + 체크 표시로 — 보라(brand.lighter) 면을 쓰지 않는다(표 선택 결정과 같은 팔레트).
 * 초점 링은 브라우저 기본을 둔다.
 */
export const option = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  minHeight: "32px",
  padding: "0 10px",
  borderRadius: "8px",
  border: `1px solid ${vars.colors.neutral[300]}`,
  color: vars.colors.text.secondary,
  fontSize: "13px",
  fontWeight: vars.fontWeights.medium,
  cursor: "pointer",
  selectors: {
    "&:has(input:checked)": {
      borderColor: vars.colors.neutral[800],
      color: vars.colors.text.primary,
      fontWeight: vars.fontWeights.semibold,
    },
  },
});

export const checkbox = style({ margin: 0, width: "14px", height: "14px", accentColor: vars.colors.neutral[800] });

export const actions = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: vars.space.sm });

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
  ":disabled": { cursor: "default", opacity: 0.5 },
});

export const row = style({ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: vars.space.sm });

export const status = style({ margin: 0, color: vars.colors.neutral[700], fontSize: "12px", lineHeight: "18px" });

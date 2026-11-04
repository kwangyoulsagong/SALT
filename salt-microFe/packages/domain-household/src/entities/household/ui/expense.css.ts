import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@repo/web-shared/ui/surface.css";

/**
 * 가계부 표시 — 데스크톱 글자 위계(`screen-desktop.md` §2) 5단만. **넘친 봉투도 같은 색**이다 — 빨강 · 경고 색을 쓰지 않는다(`FE-REQ-057` 수용 기준 2).
 * 음수 금액은 부호 글자(−)로만 구별한다.
 */
export const box = style({ display: "flex", flexDirection: "column", gap: "6px", padding: "12px 16px", borderRadius: "12px", background: SURFACE.weakFill });

export const row = style({ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px" });

export const title = style({ margin: 0, fontSize: "14px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary });

export const label = style({ fontSize: "12px", lineHeight: "16px", fontWeight: 500, color: vars.colors.neutral[600] });

export const value = style({ fontSize: "13px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary, fontVariantNumeric: "tabular-nums" });

export const bigValue = style([value, { fontSize: "22px", lineHeight: "28px", fontWeight: 700 }]);

export const note = style({ margin: 0, fontSize: "12px", lineHeight: "16px", color: vars.colors.neutral[600] });

export const list = style({ display: "flex", flexDirection: "column", margin: 0, padding: 0, listStyle: "none" });

export const item = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  padding: "10px 0",
  borderBottom: `1px solid ${SURFACE.weakFill}`,
});

export const itemMain = style({ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 });

export const itemTitle = style({ fontSize: "14px", lineHeight: "20px", fontWeight: 500, color: vars.colors.text.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" });

export const itemSide = style({ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 });

export const badge = style({ padding: "0 6px", borderRadius: "4px", background: SURFACE.weakFill, fontSize: "11px", lineHeight: "16px", fontWeight: 600, color: vars.colors.neutral[600] });

/** 봉투 막대 — 쓴 만큼 채운다(서버 spent/budget 그대로 비율, 넘치면 꽉 찬 막대 + 숫자). 색은 하나 */
export const bar = style({ height: "6px", borderRadius: "3px", background: "rgba(7, 25, 76, 0.08)", overflow: "hidden" });

export const barFill = style({ height: "100%", background: vars.colors.neutral[600] });
export const chips = style({ display: "flex", flexWrap: "wrap", gap: "6px" });

export const stack = style({ display: "flex", flexDirection: "column", gap: "8px", margin: 0, padding: 0, listStyle: "none" });

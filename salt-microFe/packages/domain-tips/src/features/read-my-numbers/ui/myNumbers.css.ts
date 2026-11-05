import { style, styleVariants } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@repo/web-shared/ui/surface.css";

/** 내 숫자 — 맞혀 보기 상자와 같은 면(같은 폭 · 같은 둥글기). 휴대폰 폭에서 숫자 줄은 라벨 위 · 값 아래로 접힌다 */
export const panel = style({ display: "flex", flexDirection: "column", gap: "12px", padding: "16px", borderRadius: "12px", background: SURFACE.weakFill });

/** 상태 칸(aria-live) 안의 숫자 · 요건 · 각주 — 패널의 gap 은 바로 아래 자식에만 걸려 안쪽 블록이 붙었다(390 실측) */
export const body = style({ display: "flex", flexDirection: "column", gap: "12px" });

export const title = style({ margin: 0, fontSize: "16px", lineHeight: "24px", fontWeight: 600, color: vars.colors.text.primary });

export const line = style({ margin: 0, fontSize: "14px", lineHeight: "22px", color: vars.colors.text.primary, wordBreak: "keep-all", maxWidth: "720px" });

export const muted = style([line, { color: "rgba(22, 31, 46, 0.64)" }]);

export const figures = style({ margin: 0, display: "flex", flexDirection: "column", gap: "8px", maxWidth: "720px" });

export const figure = style({
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  padding: "10px 14px",
  borderRadius: "10px",
  background: "#ffffff",
});

export const figureLabel = style({ margin: 0, fontSize: "14px", lineHeight: "22px", color: "rgba(22, 31, 46, 0.64)", wordBreak: "keep-all" });

export const figureValue = style({ margin: 0, fontSize: "15px", lineHeight: "22px", fontWeight: 600, color: vars.colors.text.primary, fontVariantNumeric: "tabular-nums" });

export const checksTitle = style({ margin: 0, fontSize: "14px", lineHeight: "20px", fontWeight: 600, color: vars.colors.text.primary });

export const checks = style({ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "10px", maxWidth: "720px" });

export const check = style({ display: "flex", flexDirection: "column", gap: "2px" });

export const checkHead = style({ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" });

const tagBase = style({
  flexShrink: 0,
  padding: "1px 8px",
  borderRadius: "999px",
  fontSize: "12px",
  lineHeight: "18px",
  fontWeight: 600,
  border: "1px solid rgba(22, 31, 46, 0.24)",
  color: vars.colors.text.primary,
  background: "#ffffff",
});

/** 상태는 글자 표지가 본체 — 테두리 모양은 보조(색만으로 가르지 않는다) */
export const tag = styleVariants({
  met: [tagBase, { border: `1px solid ${vars.colors.text.primary}` }],
  not_met: [tagBase, { borderStyle: "dashed" }],
  unknown: [tagBase, { color: "rgba(22, 31, 46, 0.64)" }],
});

export const footnote = style([line, { fontSize: "12px", lineHeight: "18px", color: "rgba(22, 31, 46, 0.64)" }]);

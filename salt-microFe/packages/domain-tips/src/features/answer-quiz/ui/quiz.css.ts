import { style, styleVariants } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@repo/web-shared/ui/surface.css";

/**
 * 읽기 전에 맞혀 보기 — 바로 위 메타 상자와 같은 폭(면 상자끼리 오른쪽 끝을 맞춘다 — 720 상한을 두면 1280 에서 16px 어긋났다).
 * 문장 한 줄 720 상한은 안쪽 글이 지킨다. 휴대폰 폭에서 보기는 한 줄에 하나
 */
export const quiz = style({ display: "flex", flexDirection: "column", gap: "12px", padding: "16px", borderRadius: "12px", background: SURFACE.weakFill });

export const eyebrow = style({ margin: 0, fontSize: "12px", lineHeight: "16px", fontWeight: 600, color: "rgba(22, 31, 46, 0.64)" });

export const question = style({ margin: 0, fontSize: "16px", lineHeight: "24px", fontWeight: 600, color: vars.colors.text.primary, wordBreak: "keep-all" });

export const choices = style({ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "8px", maxWidth: "720px" });

const choiceBase = style({
  width: "100%",
  minHeight: "44px",
  padding: "10px 14px",
  borderRadius: "10px",
  border: "1px solid rgba(22, 31, 46, 0.16)",
  background: "#ffffff",
  color: vars.colors.text.primary,
  fontSize: "15px",
  lineHeight: "22px",
  fontWeight: 500,
  textAlign: "left",
  wordBreak: "keep-all",
  cursor: "pointer",
  selectors: {
    "&:disabled": { cursor: "default" },
    "&:focus-visible": { outline: `2px solid ${vars.colors.text.primary}`, outlineOffset: "2px" },
  },
});

/** 정답은 굵은 테두리 · 고른 오답은 점선 — 색만으로 가르지 않는다(글자 표지도 같이) */
export const choice = styleVariants({
  idle: [choiceBase],
  right: [choiceBase, { border: `2px solid ${vars.colors.text.primary}`, fontWeight: 600 }],
  pickedWrong: [choiceBase, { borderStyle: "dashed", color: "rgba(22, 31, 46, 0.64)" }],
  rest: [choiceBase, { color: "rgba(22, 31, 46, 0.64)" }],
});

export const choiceTag = style({ marginLeft: "8px", fontSize: "12px", fontWeight: 600 });

export const result = style({ display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px", lineHeight: "22px", color: vars.colors.text.primary, wordBreak: "keep-all" });

export const verdict = style({ margin: 0, fontWeight: 700 });

export const line = style({ margin: 0 });

export const footer = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px" });

export const link = style({ color: vars.colors.text.primary, fontWeight: 600, textDecoration: "underline", textUnderlineOffset: "3px", fontSize: "14px" });

export const retry = style({
  minHeight: "36px",
  padding: "0 12px",
  borderRadius: "8px",
  border: "1px solid rgba(22, 31, 46, 0.16)",
  background: "transparent",
  color: vars.colors.text.primary,
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
});

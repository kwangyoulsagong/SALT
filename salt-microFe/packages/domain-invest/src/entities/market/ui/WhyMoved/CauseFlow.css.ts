import { style, styleVariants } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";
import { ON_MOBILE } from "@repo/core/mobile";

/**
 * 원인 → 근거 → 결과 흐름(`CauseFlow` — 한 장 패널 ② 줄 · 목록 미리보기 원인 칸) · 시장 표 "왜?" 칩.
 * ~~왜 움직였나 카드(분해 표 · 같은 날 사실 · ③ 한 줄)~~ 스타일은 카드와 함께 지웠다(F017 v4 순서 6 · `FE-REQ-064` FR-12)
 */

/** 흰 카드 위 보조 글자 — tertiary(3.03)는 axe 미달이라 lightGray(4.6) */
const caption = style({
  margin: 0,
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  color: vars.colors.text.lightGray,
});

/** 값 글자 — 작은 글자 새 자리라 진한 쌍(대비 4.5 이상, `krStock.css` changeStrong 과 같은 판단) */
export const value = styleVariants({
  up: { color: vars.colors.special.upDark, fontVariantNumeric: "tabular-nums" },
  down: { color: vars.colors.special.downDark, fontVariantNumeric: "tabular-nums" },
  flat: { color: vars.colors.text.secondary, fontVariantNumeric: "tabular-nums" },
});

/** 시장 표 행의 "왜?" — 행 이름 옆 작은 링크(터치 타깃은 행 전체가 따로 있다 · 이 링크는 키보드 · 가운데 클릭용) */
export const rowChip = style({
  display: "inline-flex",
  alignItems: "center",
  flexShrink: 0,
  padding: "1px 6px",
  borderRadius: "999px",
  border: `1px solid ${vars.colors.border.light}`,
  fontSize: "11px",
  lineHeight: "16px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.secondary,
  textDecoration: "none",
  whiteSpace: "nowrap",
  selectors: { "&:focus-visible": { outline: `2px solid ${vars.colors.border.focus}`, outlineOffset: "2px" } },
});

/** 스크린리더만 읽는 표 머리 */
export const srOnly = style({
  position: "absolute",
  width: "1px",
  height: "1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
});

/** 세로 타임라인 — 칸 셋(원인 · 근거 · 결과)이 왼쪽 선으로 이어진다(시안 `pm/docs/2026-11-13-one-panel-research.html`) */
export const causeFlow = style({ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "12px" });

export const causeStep = style({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  paddingLeft: "16px",
  borderLeft: `2px solid ${vars.colors.neutral[200]}`,
  minWidth: 0,
});

export const causeStepLabel = style({
  fontSize: "12px", selectors: { [ON_MOBILE]: { fontSize: "13px" } },
  lineHeight: "18px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.secondary,
});

export const causeHeadline = style({
  margin: 0,
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.primary,
  wordBreak: "keep-all",
  overflowWrap: "anywhere",
});

export const causeNote = style([caption, { color: vars.colors.text.secondary }]);

export const evidenceList = style({ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "6px" });

export const evidenceLine = style({
  margin: 0,
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  color: vars.colors.text.secondary,
  wordBreak: "keep-all",
  overflowWrap: "anywhere",
  fontVariantNumeric: "tabular-nums",
});

/** 단계를 정한 근거만 굵게 — 나머지는 같이 본 사실(굵기 + 숨은 글자로 말한다 · 색 아님) */
export const evidenceValue = styleVariants({
  strong: { fontWeight: vars.fontWeights.bold, color: vars.colors.text.primary },
  plain: { fontWeight: vars.fontWeights.medium, color: vars.colors.text.primary },
});

/** 출처 이름 칩 — 번호가 아니라 이름(`FE-REQ-064` FR-10 · 사용자 "1 2 3 4 가 뭐고") */
export const sourceChip = style({
  display: "inline-block",
  marginLeft: "6px",
  padding: "0 6px",
  borderRadius: "6px",
  background: vars.colors.neutral[100],
  fontSize: "12px", selectors: { [ON_MOBILE]: { fontSize: "13px" } },
  lineHeight: "18px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.secondary,
  whiteSpace: "nowrap",
});

export const gloss = style([caption, { paddingLeft: "10px", borderLeft: `2px solid ${vars.colors.neutral[100]}` }]);

export const otherCauses = style({ display: "flex", flexDirection: "column", gap: "8px" });
export const otherSummary = style({
  cursor: "pointer",
  minHeight: "32px",
  display: "flex",
  alignItems: "center",
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.secondary,
});

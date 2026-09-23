import { style, styleVariants } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/**
 * 코치 리포트 — 회색 바탕 위 흰 패널 한 단. 패널 모양은 `shared/ui/surface.css`(상세 분석과 같다).
 * 여기는 이 화면에만 있는 것 — 폭 · 머리 · 종목 자리 · 면책 띠.
 */
const CONTENT_MAX_WIDTH = "760px";
const DISCLAIMER_BAR_HEIGHT = "44px";

export const layout = style({
  width: "100%",
  maxWidth: CONTENT_MAX_WIDTH,
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  padding: `16px 0 calc(${DISCLAIMER_BAR_HEIGHT} + 32px)`,
  minWidth: 0,
});

/** 머리 패널 — 제목 · 생성 시각 | 다시 만들기 */
export const header = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: vars.space.lg,
  flexWrap: "wrap",
});

export const titleBlock = style({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  minWidth: 0,
});

export const title = style({
  margin: 0,
  color: vars.colors.text.primary,
  fontSize: "22px",
  lineHeight: "30px",
  fontWeight: vars.fontWeights.bold,
});

export const meta = style({
  margin: 0,
  color: vars.colors.neutral[500],
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.medium,
});

/* ── 종목 자리 ─────────────────────────────────────────────── */

const identityBase = style({
  display: "inline-flex",
  alignItems: "center",
  minWidth: 0,
});

export const identity = styleVariants({
  md: [identityBase, { gap: "10px" }],
  sm: [identityBase, { gap: "6px" }],
});

export const identityText = style({
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
});

const nameBase = style({
  color: vars.colors.text.primary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const identityName = styleVariants({
  md: [nameBase, { fontSize: "15px", lineHeight: "22px", fontWeight: vars.fontWeights.semibold }],
  sm: [
    nameBase,
    {
      color: vars.colors.neutral[600],
      fontSize: "12px",
      lineHeight: "16px",
      fontWeight: vars.fontWeights.semibold,
    },
  ],
});

export const identitySymbol = style({
  color: vars.colors.neutral[500],
  fontSize: "12px",
  lineHeight: "16px",
  fontWeight: vars.fontWeights.medium,
});

/** 패널 밖 회색 바탕 위의 작은 글 — 제외 안내 */
export const footnote = style({
  margin: 0,
  padding: "4px 8px 0",
  color: vars.colors.neutral[500],
  fontSize: "12px",
  lineHeight: "18px",
  fontWeight: vars.fontWeights.medium,
});

/** 면책 — 하단 고정(FR-90 · 상세 분석과 같은 자리). 박스 없이 작은 회색 글 */
export const disclaimerBar = style({
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: vars.zIndices.sticky,
  minHeight: DISCLAIMER_BAR_HEIGHT,
  display: "flex",
  alignItems: "center",
  gap: vars.space.md,
  padding: `${vars.space.sm} ${vars.space.xl}`,
  background: vars.colors.background.white,
  borderTop: `1px solid ${vars.colors.neutral[100]}`,
  color: vars.colors.neutral[500],
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.medium,
});

export const disclaimerLabel = style({
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.primary,
  whiteSpace: "nowrap",
});

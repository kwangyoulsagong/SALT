import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 설명 · 항목 글자 — 흰 패널 위 AA 2단 글자색(내 데이터 패널과 같은 값, 2026-11-12 axe) */
const SECONDARY = "rgba(22, 31, 46, 0.64)";

export const description = style({
  margin: 0,
  color: SECONDARY,
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.medium,
});

export const block = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.xs,
});

export const blockTitle = style({
  margin: 0,
  color: vars.colors.text.primary,
  fontSize: "14px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
});

export const serviceList = style({
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: vars.space.sm,
});

export const serviceName = style({
  display: "block",
  color: vars.colors.text.primary,
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
});

export const groupRow = style({
  display: "flex",
  alignItems: "flex-start",
  gap: vars.space.xs,
  marginTop: "4px",
});

export const items = style({
  color: SECONDARY,
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.medium,
  wordBreak: "keep-all",
});

/** 불러오기 전 자리 — 서비스 여섯 줄 높이(뒤집혀 보이지 않게) */
export const placeholder = style({
  height: "240px",
});

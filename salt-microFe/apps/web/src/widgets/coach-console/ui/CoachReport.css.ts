import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/**
 * 코치 리포트 — **회색 화면 위 흰 패널, 한 단**.
 *
 * 설계 원칙(2026-09-23 리서치):
 * - 본문은 한 단 · 최대 800px. 두 단이면 한쪽만 길어져 빈 칸이 생긴다(첫 구현 스크린샷)
 * - 패널은 떠 보이는 그림자가 아니라 **헤어라인** — 흰 면과 회색 바탕의 경계만 만든다
 * - 섹션 하나에 제목(18px bold) → 한 줄 설명(13px 회색) → 목록 행
 * - 화면 제목 아래 생성 시각은 작은 회색 한 줄, 주된 행동이 아닌 버튼은 회색 약한 버튼
 */
const CONTENT_MAX_WIDTH = "800px";
const PANEL_RADIUS = "12px";
const PANEL_SHADOW = "0 0 0 0.75px rgba(2,32,71,0.05), 0 1px 1px rgba(0,0,0,0.04)";
const DISCLAIMER_BAR_HEIGHT = "44px";
const NARROW = "screen and (max-width: 640px)";

export const layout = style({
  width: "100%",
  maxWidth: CONTENT_MAX_WIDTH,
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  padding: `24px 0 calc(${DISCLAIMER_BAR_HEIGHT} + 32px)`,
  minWidth: 0,
});

export const backLink = style({
  alignSelf: "flex-start",
  color: vars.colors.neutral[600],
  fontSize: "14px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.medium,
  textDecoration: "none",
  ":hover": { color: vars.colors.neutral[800] },
});

export const header = style({
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: vars.space.lg,
  flexWrap: "wrap",
  padding: "4px 4px 8px",
});

export const titleBlock = style({
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  minWidth: 0,
});

export const title = style({
  margin: 0,
  color: vars.colors.text.primary,
  fontSize: "26px",
  lineHeight: "34px",
  fontWeight: vars.fontWeights.bold,
});

export const meta = style({
  margin: 0,
  color: vars.colors.neutral[500],
  fontSize: "13px",
  lineHeight: "19px",
});

export const panel = style({
  display: "flex",
  flexDirection: "column",
  gap: "20px",
  padding: "24px",
  borderRadius: PANEL_RADIUS,
  background: vars.colors.background.white,
  boxShadow: PANEL_SHADOW,
  minWidth: 0,
  "@media": { [NARROW]: { padding: "20px" } },
});

export const panelHead = style({
  display: "flex",
  flexDirection: "column",
  gap: "4px",
});

export const panelTitleRow = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
});

export const panelTitle = style({
  margin: 0,
  color: vars.colors.text.primary,
  fontSize: "18px",
  lineHeight: "26px",
  fontWeight: vars.fontWeights.bold,
});

export const panelDescription = style({
  margin: 0,
  color: vars.colors.neutral[500],
  fontSize: "13px",
  lineHeight: "19px",
});

/** 패널 밖 회색 바탕 위의 작은 글 — 제외 안내 */
export const footnote = style({
  margin: 0,
  padding: "0 4px",
  color: vars.colors.neutral[500],
  fontSize: "13px",
  lineHeight: "19px",
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
  justifyContent: "center",
  gap: vars.space.sm,
  padding: `${vars.space.sm} ${vars.space.xl}`,
  background: vars.colors.background.white,
  borderTop: `1px solid ${vars.colors.neutral[100]}`,
  color: vars.colors.neutral[500],
  fontSize: "13px",
  lineHeight: "19px",
});

export const disclaimerLabel = style({
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.neutral[700],
  whiteSpace: "nowrap",
});

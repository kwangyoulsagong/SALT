import { style } from "@vanilla-extract/css";

import { enterReveal } from "@repo/ui/enterReveal";
import { vars } from "@repo/ui/tokens";

import { card } from "@repo/web-shared/ui/surface.css";

/**
 * 저축 목표 데스크톱 화면(`FE-REQ-060` FR-1 · 8 · 12). 틀은 `PageFrame`(바탕 · 패널 · 사이드 312). 면은 카드 판 위 흰 카드(`FE-REQ-076`).
 * 1280 이상: 목록 | 미리보기(360) 두 칸 · 1280 미만: 미리보기가 목록 아래로 · 사이드는 1024 이상(태블릿은 본문 아래 — PageFrame)
 */
const WIDE = "screen and (min-width: 1280px)";

const title = {
  margin: 0,
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text1,
} as const;
const label = {
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
} as const;

/** 새 목표 — 머리 오른쪽 작은 링크(32 높이 · 14/600 · 모서리 8, `screen-desktop.md` §3 버튼 값). 주 버튼은 미리보기 칸의 넣기 하나 */
export const addLink = style({
  display: "inline-flex",
  alignItems: "center",
  height: "32px",
  padding: "0 12px",
  borderRadius: "8px",
  // 카드 판(grey100) 위라 흰 면 — 옅은 회색 면은 판과 같아 안 보였다(`FE-REQ-076`)
  background: vars.colors.background.white,
  color: vars.colors.desk.text1,
  fontSize: vars.deskType.section.fontSize,
  lineHeight: vars.deskType.section.lineHeight,
  fontWeight: vars.deskType.section.fontWeight,
  textDecoration: "none",
  whiteSpace: "nowrap",
  transition: `background-color ${vars.motion.duration.instant}`,
  ":hover": { background: vars.colors.desk.line },
  ":focus-visible": { outline: `2px solid ${vars.colors.border.focus}`, outlineOffset: "2px" },
});

/* ── 본문 ─────────────────────────────────────────────────── */
/** 금액 카드 대기 칸 — 실제 카드 높이(`FE-REQ-076` 2회차 실측: 1280 이상 112 · 아래 190) */
export const summarySkeleton = style({ height: "190px", "@media": { [WIDE]: { height: "112px" } } });

export const board = style({ display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 });
export const description = style({ ...label, margin: 0 });

export const split = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "24px",
  alignItems: "start",
  "@media": { [WIDE]: { gridTemplateColumns: "minmax(0, 1fr) 360px" } },
});

/** 묶음 = 카드 판 위 흰 카드(`FE-REQ-076` FR-7 — 목표 목록 · 고른 목표) */
export const section = style([card, { gap: "8px" }]);
export const sectionHead = style({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", minHeight: "32px" });
export const sectionTitle = style({
  ...title,
});
export const hint = style({ ...label, margin: 0 });

/**
 * 미리보기 칸 — 목표를 바꾸면 새 칸이 8px 아래에서 올라온다(`motion.md` §1 블록 등장).
 * 이미 카드 안이라 상자 면 · 선을 두지 않는다(카드 안 카드 0 — `FE-REQ-076` FR-7, 전 정보 상자 + 안쪽 선)
 */
export const preview = style({
  ...enterReveal,
  display: "flex",
  flexDirection: "column",
  gap: "12px",
});
export const previewHead = style({ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px" });
export const previewTitle = style({ ...title, fontSize: vars.deskType.section.fontSize, lineHeight: vars.deskType.section.lineHeight });
export const detailLink = style({
  ...label,
  flexShrink: 0,
  color: vars.colors.desk.text1,
  fontWeight: vars.deskType.body.fontWeight,
  textDecoration: "none",
  ":hover": { textDecoration: "underline" },
  ":focus-visible": { outline: `2px solid ${vars.colors.border.focus}`, outlineOffset: "2px", borderRadius: "4px" },
});
export const lead = style({ display: "flex", flexDirection: "column", gap: "2px" });
export const leadValue = style({
  fontSize: vars.deskType.title.fontSize,
  lineHeight: vars.deskType.title.lineHeight,
  fontWeight: vars.deskType.title.fontWeight,
  color: vars.colors.desk.text1,
  fontVariantNumeric: "tabular-nums",
});
export const depositBlock = style({ display: "flex", flexDirection: "column", paddingTop: "4px", borderTop: `1px solid ${vars.colors.desk.line}` });


/* ── 사이드 ───────────────────────────────────────────────── */
export const sideBlock = style({ display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 });
export const sideTitle = style(title);
/** 한 줄 상태(FR-13) — 실패 + 다시 불러오기 · 빈 목록은 칸 높이를 조금 지킨다 */
export const statusRow = style({ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", minHeight: "120px" });
export const emptyRow = style({ display: "flex", alignItems: "center", minHeight: "96px", padding: "0 8px" });

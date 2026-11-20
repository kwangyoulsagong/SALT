import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 상세 머리 첫 줄 — 뒤로 버튼(아이콘 24 · 누름 36 · 모서리 9) + 이동 경로 한 줄(12/500 · 2단 — 3단은 글자에 쓰지 않는다, `FE-REQ-047` FR-10 · FR-13) */
export const row = style({ display: "flex", alignItems: "center", gap: vars.space.xs, minHeight: "36px" });

export const button = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "36px",
  height: "36px",
  flexShrink: 0,
  borderRadius: "9px",
  color: vars.colors.desk.text1,
  textDecoration: "none",
  transition: `background ${vars.motion.duration.instant}`,
  ":hover": { background: vars.colors.desk.line },
  // 안쪽으로 — 바깥(2px)이면 바로 옆 이동 경로 첫 글자를 덮었다(2026-11-19 키보드 확인)
  ":focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "-2px" },
});

export const trail = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.xs,
  minWidth: 0,
  margin: 0,
  padding: 0,
  listStyle: "none",
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
});

/**
 * 이동 경로 칸 — 줄바꿈 없이 한 줄. 앞 칸(목록 이름)은 줄지 않고 **마지막 칸(지금 화면)만 줄어 말줄임**.
 * `nav` · 마지막 칸에 `minWidth: 0` 이 없으면 긴 이름이 줄지 않아 360 에서 20px 가로로 넘쳤다(2026-11-20 금융 팁 글)
 */
export const nav = style({ minWidth: 0 });

export const crumb = style({
  display: "inline-flex",
  alignItems: "center",
  gap: vars.space.xs,
  whiteSpace: "nowrap",
  flexShrink: 0,
  selectors: { "&:last-child": { flexShrink: 1, minWidth: 0 } },
});

export const crumbLink = style({ color: "inherit", textDecoration: "none", ":hover": { color: vars.colors.desk.text1 } });

export const current = style({ color: vars.colors.desk.text1, overflow: "hidden", textOverflow: "ellipsis" });

export const separator = style({ color: vars.colors.desk.nonText3 });

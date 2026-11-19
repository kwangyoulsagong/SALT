import { style, styleVariants } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/**
 * 데스크톱 한 달 화면 부품(`FE-REQ-060` FR-3 · FR-4 · `screen-desktop.md` §4 "날짜 묶음 목록").
 * 글자는 다섯 단 토큰만 — 13/600 이름 · 값, 12/500 보조 · 묶음 머리. 면은 놓는 패널 · 정보 상자가 준다
 */
const label = {
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
} as const;
const body = {
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text1,
} as const;

export const groups = style({ display: "flex", flexDirection: "column", gap: "12px", margin: 0, padding: 0, minWidth: 0 });

/** 묶음 머리 — 날짜 · 그날 합(12/500), 아래 얇은 선 */
export const groupHead = style({
  ...label,
  display: "flex",
  justifyContent: "space-between",
  gap: "8px",
  margin: 0,
  padding: "0 8px 4px",
  boxShadow: `inset 0 -1px 0 ${vars.colors.desk.line}`,
  fontVariantNumeric: "tabular-nums",
});

export const rows = style({ display: "flex", flexDirection: "column", margin: 0, padding: 0, listStyle: "none", minWidth: 0 });

/** 목록 행 — 왼쪽 판 32 · 이름 + 보조 · 오른쪽 금액(56, 보조 줄 없으면 44) · 호버 면 모서리 8 */
export const row = style({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  minHeight: "44px",
  padding: "6px 8px",
  borderRadius: "8px",
  ":hover": { background: vars.colors.desk.line },
});

/** 분류 판 — 그림 자산이 없어 분류 첫 글자(`FE-REQ-060` 범위 밖 표 "분류 아이콘 그림") */
export const plate = style({
  ...label,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  width: "32px",
  height: "32px",
  borderRadius: "8px",
  background: vars.colors.desk.line,
  color: vars.colors.desk.text1,
  fontWeight: vars.fontWeights.semibold,
});

export const rowMain = style({ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 });
export const rowTitle = style({ ...body, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" });
export const rowCaption = style({ ...label, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" });
export const rowSide = style({ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 });
export const amount = style({ ...body, fontVariantNumeric: "tabular-nums", textAlign: "right" });
export const badge = style({ ...label, padding: "0 6px", borderRadius: "4px", background: vars.colors.desk.line });

/** 봉투 · 비율 막대 — 높이 4 · 표시 비율만(금액 계산 아님) */
export const bar = style({ height: "4px", borderRadius: "2px", background: vars.colors.desk.line, overflow: "hidden", marginTop: "4px" });
export const barFill = style({ height: "100%", background: vars.colors.neutral[600] });

/** 분류 비율 — 가로 막대 하나(도넛 대신, FR-4) */
export const ratioBar = style({ display: "flex", height: "8px", borderRadius: "4px", overflow: "hidden", background: vars.colors.desk.line });
/** 칸 색 — 회색 단계만(색으로 좋고 나쁨을 말하지 않는다). 칸 사이 1px 흰 틈 */
export const ratioPart = styleVariants({
  0: { background: vars.colors.neutral[800], boxShadow: "inset -1px 0 0 #fff" },
  1: { background: vars.colors.neutral[600], boxShadow: "inset -1px 0 0 #fff" },
  2: { background: vars.colors.neutral[400], boxShadow: "inset -1px 0 0 #fff" },
  3: { background: vars.colors.neutral[300], boxShadow: "inset -1px 0 0 #fff" },
  4: { background: vars.colors.neutral[200] },
});
export const legend = style({ display: "flex", flexDirection: "column", margin: 0, padding: 0, listStyle: "none" });
export const legendRow = style({ ...label, display: "flex", alignItems: "center", gap: "8px", minHeight: "28px", padding: "0 8px" });
export const legendName = style({ flex: 1, minWidth: 0, color: vars.colors.desk.text1 });
export const legendValue = style({ fontVariantNumeric: "tabular-nums", color: vars.colors.desk.text1, fontWeight: vars.deskType.body.fontWeight });
export const swatch = styleVariants({
  0: { width: "8px", height: "8px", borderRadius: "2px", background: vars.colors.neutral[800], flexShrink: 0 },
  1: { width: "8px", height: "8px", borderRadius: "2px", background: vars.colors.neutral[600], flexShrink: 0 },
  2: { width: "8px", height: "8px", borderRadius: "2px", background: vars.colors.neutral[400], flexShrink: 0 },
  3: { width: "8px", height: "8px", borderRadius: "2px", background: vars.colors.neutral[300], flexShrink: 0 },
  4: { width: "8px", height: "8px", borderRadius: "2px", background: vars.colors.neutral[200], flexShrink: 0 },
});

export const note = style({ ...label, margin: 0 });

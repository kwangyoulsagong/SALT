import { style, styleVariants } from "@vanilla-extract/css";

import { ON_MOBILE } from "@repo/core/mobile";
import { growInX } from "@repo/ui/enterReveal";
import { vars } from "@repo/ui/tokens";

/** 휴대폰(`/m`) 글자(`screen-mobile.md` §1 · `FE-REQ-060` 모바일 표 "목록 행") — 이름 · 금액 t5, 보조 t7 */
const appBody = { fontSize: vars.appType.body.fontSize, lineHeight: vars.appType.body.lineHeight, fontWeight: vars.appType.body.fontWeight, color: vars.colors.text.primary } as const;
const appCaption = { fontSize: vars.appType.caption.fontSize, lineHeight: vars.appType.caption.lineHeight, fontWeight: vars.appType.caption.fontWeight, color: vars.colors.text.tertiary } as const;

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
  // 글자를 키우면 날짜 · 그날 합이 세로로 쌓인다(FR-M4)
  flexWrap: "wrap",
  selectors: { [ON_MOBILE]: { ...appCaption, padding: "8px 4px 4px" } },
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
  // 휴대폰(`/m`) 목록 행 — 세로 여백 12 · 호버 면 없음(터치). 글자를 키우면 금액이 다음 줄로(FR-M4)
  selectors: { [ON_MOBILE]: { padding: "12px 4px", gap: "12px", flexWrap: "wrap", background: "transparent" } },
});

/** 분류 판 — 그림 자산이 없어 분류 첫 글자(`FE-REQ-060` 범위 밖 표 "분류 아이콘 그림") */
export const plate = style({
  ...label,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  // 데스크톱 40 · 모서리 12 — 휴대폰 아이콘 판과 같은 모양을 데스크톱 행 높이 안에서(`FE-REQ-076` FR-6, 전 32 · 8)
  width: "40px",
  height: "40px",
  borderRadius: "12px",
  // 가계부 도메인 색 옅은 판 + 분류 선 아이콘(2026-11-20). 도메인 색은 작은 표지에만
  background: "rgba(232, 89, 12, 0.1)",
  color: vars.colors.domain.household,
  // 휴대폰(`/m`) 목록 왼쪽 = 아이콘 판 44 · 모서리 12(`mobile-design.md` §2 · `FE-REQ-074` FR-2)
  selectors: { [ON_MOBILE]: { width: "44px", height: "44px", borderRadius: "12px" } },
});

// 휴대폰(`/m`) — 이름 칸이 96 아래로 줄면 금액이 다음 줄로 내려간다(글자 160 · 200%, FR-M4)
export const rowMain = style({ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, selectors: { [ON_MOBILE]: { flex: "1 1 96px" } } });
export const rowTitle = style({ ...body, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", selectors: { [ON_MOBILE]: appBody } });
export const rowCaption = style({ ...label, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", selectors: { [ON_MOBILE]: appCaption } });
export const rowSide = style({ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, selectors: { [ON_MOBILE]: { marginLeft: "auto", flexWrap: "wrap", justifyContent: "flex-end" } } });
export const amount = style({ ...body, fontVariantNumeric: "tabular-nums", textAlign: "right", selectors: { [ON_MOBILE]: { ...appBody, fontWeight: "700", overflowWrap: "anywhere" } } });
export const badge = style({ ...label, padding: "0 6px", borderRadius: "4px", background: vars.colors.desk.line });

/** 봉투 · 비율 막대 — 높이 4 · 표시 비율만(금액 계산 아님) */
export const bar = style({ height: "4px", borderRadius: "2px", background: vars.colors.desk.line, overflow: "hidden", marginTop: "4px" });
export const barFill = style({ height: "100%", background: vars.colors.neutral[600], ...growInX });

/** 분류 비율 — 가로 막대 하나(도넛 대신, FR-4) */
export const ratioBar = style({ display: "flex", height: "8px", borderRadius: "4px", overflow: "hidden", background: vars.colors.desk.line, ...growInX });
/** 칸 색 — 회색 단계만(색으로 좋고 나쁨을 말하지 않는다). 칸 사이 1px 흰 틈 */
/** 분류 막대 색 — 가계부 도메인 색 한 계열(진한 → 옅은, 2026-11-20 — 회색 단계가 밋밋했다). 다섯째부터는 같은 옅은 회색 */
const RATIO_TONES = [vars.colors.domain.household, "#F08C4A", "#F5B183", "#F9D2B6", vars.colors.neutral[200]] as const;
export const ratioPart = styleVariants({
  0: { background: RATIO_TONES[0], boxShadow: "inset -1px 0 0 #fff" },
  1: { background: RATIO_TONES[1], boxShadow: "inset -1px 0 0 #fff" },
  2: { background: RATIO_TONES[2], boxShadow: "inset -1px 0 0 #fff" },
  3: { background: RATIO_TONES[3], boxShadow: "inset -1px 0 0 #fff" },
  4: { background: RATIO_TONES[4] },
});
export const legend = style({ display: "flex", flexDirection: "column", margin: 0, padding: 0, listStyle: "none" });
export const legendRow = style({ ...label, display: "flex", alignItems: "center", gap: "8px", minHeight: "28px", padding: "0 8px", selectors: { [ON_MOBILE]: { ...appCaption, minHeight: "44px", padding: "0 4px", flexWrap: "wrap" } } });
export const legendName = style({ flex: 1, minWidth: 0, color: vars.colors.desk.text1 });
export const legendValue = style({ fontVariantNumeric: "tabular-nums", color: vars.colors.desk.text1, fontWeight: vars.deskType.body.fontWeight });
export const swatch = styleVariants({
  0: { width: "8px", height: "8px", borderRadius: "2px", background: RATIO_TONES[0], flexShrink: 0 },
  1: { width: "8px", height: "8px", borderRadius: "2px", background: RATIO_TONES[1], flexShrink: 0 },
  2: { width: "8px", height: "8px", borderRadius: "2px", background: RATIO_TONES[2], flexShrink: 0 },
  3: { width: "8px", height: "8px", borderRadius: "2px", background: RATIO_TONES[3], flexShrink: 0 },
  4: { width: "8px", height: "8px", borderRadius: "2px", background: RATIO_TONES[4], flexShrink: 0 },
});

export const note = style({ ...label, margin: 0 });

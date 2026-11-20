import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 1024 이상 = 데스크톱 행(오른쪽 칸에 출처 · 유효기한), 그 아래 = 요약 아래 한 줄(`FE-REQ-060` FR-10 · FR-12) */
const DESKTOP = "screen and (min-width: 1024px)";

const label = {
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
} as const;

/** 제목 아래 한 줄 설명 — 13/500 2단 · 한 줄 최대 720 */
export const description = style({
  margin: 0,
  maxWidth: "720px",
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: 500,
  color: vars.colors.desk.text2,
  wordBreak: "keep-all",
});

/**
 * 목록 폭 — 글 단 720 + 유효기한 · 셰브론 칸. 넓은 패널 끝까지 늘리면 1920 에서 제목과 유효기한이 800px 떨어졌다(2026-11-20 실화면 —
 * 저축 2단계 "넓은 패널 값 600px 떨어짐"과 같은 원인). 남는 폭은 비워 둔다(문장 한 줄 720, `screen-desktop.md` §2)
 */
export const list = style({ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", width: "100%", maxWidth: "920px" });

/** 행 사이 선 — 안쪽 0.75px(그림자 카드 · 회색 상자 0, FR-1) */
export const rowItem = style({ selectors: { "& + &": { boxShadow: `inset 0 0.75px 0 ${vars.colors.desk.line}` } } });

/** 행 — 호버 면 모서리 8(`screen-desktop.md` §3 표 행). 행 전체가 링크 · 오른쪽 셰브론 */
export const row = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "center",
  gap: vars.space.md,
  padding: `${vars.space.md} ${vars.space.sm}`,
  borderRadius: "8px",
  color: vars.colors.desk.text1,
  textDecoration: "none",
  // 호버 면 · 누름 0.99 — 저축 목표 행과 같은 장치(`motion.md` 누름, 줄인 모션이면 끔)
  transition: `background-color ${vars.motion.duration.instant}, transform ${vars.motion.duration.instant}`,
  ":hover": { background: vars.colors.desk.line },
  ":active": { transform: "scale(0.99)" },
  ":focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "-2px" },
  "@media": {
    [DESKTOP]: { gridTemplateColumns: "minmax(0, 1fr) auto auto", gap: vars.space.lg },
    "(prefers-reduced-motion: reduce)": { transition: "none", selectors: { "&:active": { transform: "none" } } },
  },
});

export const rowText = style({ display: "flex", flexDirection: "column", gap: vars.space.xs, minWidth: 0 });

export const rowTitle = style({
  fontSize: vars.deskType.section.fontSize,
  lineHeight: vars.deskType.section.lineHeight,
  fontWeight: vars.deskType.section.fontWeight,
  wordBreak: "keep-all",
});

/** 요약 13 · 두 줄까지 */
export const rowSummary = style({
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: 500,
  color: vars.colors.desk.text2,
  wordBreak: "keep-all",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
});

/** 요약 아래 출처 한 줄 */
export const rowMeta = style({ ...label, wordBreak: "keep-all" });

/** 1024 미만 — 출처 옆 유효기한(오른쪽 칸이 없다) */
export const rowMetaInline = style({ "@media": { [DESKTOP]: { display: "none" } } });

/** 1024 이상 — 오른쪽 칸 유효기한 한 줄(오른쪽 정렬 · 고정폭 숫자 · 줄바꿈 없음) */
export const rowTrailing = style({
  ...label,
  display: "none",
  "@media": { [DESKTOP]: { display: "block", textAlign: "right", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" } },
});

/** 확인 필요 — 글자 표지(색만으로 전하지 않는다), 제목 앞 */
export const badge = style({ ...label, marginRight: vars.space.sm, fontWeight: 600, color: vars.colors.status.warningDark });

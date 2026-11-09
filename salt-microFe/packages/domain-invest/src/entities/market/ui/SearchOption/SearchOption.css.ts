import { style, styleVariants } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/**
 * 검색 모달 행(`FE-REQ-066` FR-3 · FR-4 — 참고 화면 실측 2026-11-09): 결과 행 54 · 순위 행 44 · 패딩 8×12 · 모서리 10 ·
 * 고른 행 = 옅은 면(`rgba(2,32,71,.05)`) + 오른쪽 ↵ 칩. 로고는 우리 `AssetIcon` md(32 — 실측 28 · 30 의 사이 크기를 새로 두지 않는다)
 */
const ACTIVE_SURFACE = "rgba(2, 32, 71, 0.05)";

export const row = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.xs,
  listStyle: "none",
  borderRadius: "10px",
  selectors: { '&:has([aria-selected="true"])': { background: ACTIVE_SURFACE } },
});

const optionBase = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  flex: 1,
  minWidth: 0,
  padding: `${vars.space.sm} ${vars.space.md}`,
  borderRadius: "10px",
  color: vars.colors.text.primary,
  textDecoration: "none",
  cursor: "pointer",
  selectors: { "&:hover": { background: ACTIVE_SURFACE } },
});

export const option = styleVariants({
  result: [optionBase, { minHeight: "54px" }],
  rank: [optionBase, { minHeight: "44px" }],
});

export const rank = style({
  width: "18px",
  flexShrink: 0,
  fontSize: vars.fontSizes.base,
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  textAlign: "center",
  fontVariantNumeric: "tabular-nums",
});

export const nameBlock = style({ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 });

export const name = style({
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: vars.fontSizes.base,
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
});

/** 일치 부분 — 파랑 700(실측). 색만이 아니라 굵기도 바뀐다 */
export const mark = style({ background: "transparent", color: vars.colors.status.infoDark, fontWeight: vars.fontWeights.bold });

export const code = style({
  fontSize: "12px",
  lineHeight: "16px",
  fontWeight: vars.fontWeights.medium,
  color: vars.colors.neutral[700],
});

export const values = style({ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 });

export const price = style({
  fontSize: vars.fontSizes.base,
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  fontVariantNumeric: "tabular-nums",
});

const changeBase = style({ fontSize: "13px", lineHeight: "20px", fontWeight: vars.fontWeights.semibold, fontVariantNumeric: "tabular-nums" });
export const change = styleVariants({
  // 13px 작은 글자 — 솔리드 등락색은 흰 면 · 고른 면 위 4.5:1 아래(2026-11-09 axe). 새 요소라 짙은 쪽을 쓴다(기존 표 색은 그대로)
  up: [changeBase, { color: vars.colors.special.upDark }],
  down: [changeBase, { color: vars.colors.special.downDark }],
  flat: [changeBase, { color: vars.colors.neutral[700] }],
});

/** 고른 행 오른쪽 ↵ 칩 — 고른 행에서만 보인다(화면 리더는 안내 바가 알린다) */
export const enterChip = style({
  display: "none",
  alignItems: "center",
  justifyContent: "center",
  width: "28px",
  height: "24px",
  flexShrink: 0,
  borderRadius: "6px",
  background: ACTIVE_SURFACE,
  fontSize: "12px",
  color: vars.colors.neutral[700],
  selectors: { '[aria-selected="true"] &': { display: "inline-flex" } },
});

export const action = style({ flexShrink: 0, paddingRight: vars.space.sm });
/** 격자 줄의 고르는 칸 — 링크가 칸을 채운다 */
export const cell = style({ display: "flex", flex: 1, minWidth: 0 });

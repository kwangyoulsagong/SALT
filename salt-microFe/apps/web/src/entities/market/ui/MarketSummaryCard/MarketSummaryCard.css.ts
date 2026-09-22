import { style } from "@vanilla-extract/css";
import { vars } from "@repo/ui/tokens";

/**
 * 치수는 참고 화면 실측이다(2026-09-22, 1600px 창): 띠 176 · 대표 칸 이름 13 · 가격 14 · 차트 폭 전체,
 * 작은 항목 높이 56 · 차트 56×40 · 이름 12 · 가격 14 · 태그 11. 글자가 작고 칸이 촘촘해야 띠가 표보다
 * 앞에 나서지 않는다. 13 · 11 은 토큰에 없는 크기라 여기서만 쓴다(단일 컴포넌트 수치 — `constants-convention.md`).
 */

/** 링크 공통 — 테두리 없이 hover 때만 옅은 바탕. 포커스 표시는 지우지 않는다(`a11y-policy.md`) */
const linkBase = style({
  boxSizing: "border-box",
  display: "flex",
  minWidth: 0,
  padding: "8px 12px",
  borderRadius: vars.radius.base,
  color: "inherit",
  textDecoration: "none",
  transition: "background-color 120ms ease",
  selectors: {
    "&:hover": { backgroundColor: vars.colors.neutral[100] },
    "&:focus-visible": {
      outline: `2px solid ${vars.colors.border.focus}`,
      outlineOffset: "-2px",
    },
  },
});

// ── 대표 종목 ───────────────────────────────────────────

export const featured = style([
  linkBase,
  {
    flexDirection: "column",
    height: "100%",
  },
]);

/**
 * 대표 차트 자리 — 높이 77 고정(참고 화면). 폭은 재서 넘긴다(`useElementWidth`).
 * 세로 배분: 여백 8 + 이름 20 + 가격 20 + 4 + 차트 77 + 4 + 아래 줄 32 + 여백 8 = 173 ≤ 띠 176
 */
export const featuredChart = style({
  height: "77px",
  margin: `${vars.space.xs} 0`,
});

/** 대표 칸 아래 줄 — 고가 · 저가 · 거래대금. 이름 12 회색 위, 값 12 굵게 아래 */
export const stats = style({
  display: "flex",
  gap: "10px",
  whiteSpace: "nowrap",
  fontVariantNumeric: "tabular-nums",
});

export const statLabel = style({
  display: "block",
  fontSize: vars.fontSizes.sm,
  lineHeight: "16px",
  color: vars.colors.text.tertiary,
});

export const statValue = style({
  display: "block",
  fontSize: vars.fontSizes.sm,
  lineHeight: "16px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.primary,
});

export const featuredName = style({
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
});

// ── 작은 항목 ───────────────────────────────────────────

export const compact = style([
  linkBase,
  {
    alignItems: "center",
    gap: vars.space.md,
    height: "56px",
    paddingRight: vars.space.sm,
  },
]);

/** 태그가 붙은 항목만 옅게 칠한다 — 색은 변동률 방향과 같다(태그 문구는 방향을 말하지 않는다) */
export const tintUp = style({
  backgroundColor: vars.colors.special.upLight,
  selectors: { "&:hover": { backgroundColor: vars.colors.special.upLight } },
});
export const tintDown = style({
  backgroundColor: vars.colors.special.downLight,
  selectors: { "&:hover": { backgroundColor: vars.colors.special.downLight } },
});

export const compactChart = style({
  flexShrink: 0,
  width: "56px",
  height: "40px",
});

export const compactBody = style({
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
});

export const compactName = style({
  fontSize: vars.fontSizes.sm,
  lineHeight: "16px",
  fontWeight: vars.fontWeights.medium,
});

// ── 공통 조각 ─────────────────────────────────────────────

export const head = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.xs,
  minWidth: 0,
  whiteSpace: "nowrap",
  color: vars.colors.text.primary,
});

export const nameText = style({
  overflow: "hidden",
  textOverflow: "ellipsis",
});

/** 회색 알약 태그 */
export const tag = style({
  flexShrink: 0,
  padding: "0 4px",
  borderRadius: vars.radius.small,
  backgroundColor: vars.colors.neutral[100],
  color: vars.colors.neutral[700],
  fontSize: "11px",
  lineHeight: "16px",
  fontWeight: vars.fontWeights.medium,
});

export const priceRow = style({
  display: "flex",
  alignItems: "baseline",
  gap: vars.space.xs,
  minWidth: 0,
  whiteSpace: "nowrap",
  fontSize: vars.fontSizes.base,
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  fontVariantNumeric: "tabular-nums",
  color: vars.colors.text.primary,
});

export const change = style({
  overflow: "hidden",
  textOverflow: "ellipsis",
  fontWeight: vars.fontWeights.regular,
});

export const up = style({ color: vars.colors.special.up });
export const down = style({ color: vars.colors.special.down });
export const flat = style({ color: vars.colors.text.tertiary });

/** 스켈레톤 한 줄 — 실제 이름 · 가격 줄과 같은 20px 높이, 막대는 가운데 */
export const skeletonLine = style({
  display: "flex",
  alignItems: "center",
  height: "20px",
});

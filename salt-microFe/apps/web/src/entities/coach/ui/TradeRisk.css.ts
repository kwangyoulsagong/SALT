import { style, styleVariants } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/**
 * F009 카드(결과 줄 · 게이지 · 내 계획) — 참고 화면 실측(2026-09-24, 주문 패널).
 *
 * - 조밀형: 본문 13px · 보조 12px · 줄 간격 한 묶음 안 8px, 묶음 사이 14~16px
 * - 숫자는 13/600, 자릿수 고정(`tabular-nums`) — 값이 바뀌어도 줄이 흔들리지 않는다
 * - 경계는 테두리가 아니라 옅은 면(`rgba(7,25,76,.04)`)과 헤어라인
 */

/** 전역 `body` 에 글꼴이 없다(기존) — 카드가 토큰 글꼴을 직접 갖는다 */
export const stack = style({ display: "flex", flexDirection: "column", gap: vars.space.sm, fontFamily: vars.fontFamily.base });

export const cardTitle = style({
  margin: 0,
  color: vars.colors.text.primary,
  fontSize: "18px",
  lineHeight: "24px",
  fontWeight: vars.fontWeights.bold,
});

export const lines = style({
  margin: 0,
  padding: "12px 14px",
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  borderRadius: "12px",
  background: "rgba(7, 25, 76, 0.04)",
});

export const line = style({
  color: vars.colors.text.secondary,
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.medium,
  fontVariantNumeric: vars.numeric.tabular,
});

export const lineStrong = style({
  color: vars.colors.text.primary,
  fontSize: "14px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.bold,
  fontVariantNumeric: vars.numeric.tabular,
});

/** 계산 불가 · 안내 — 회색 12px. 대비는 AA(neutral 600) */
export const hint = style({
  margin: 0,
  color: vars.colors.neutral[600],
  fontSize: "12px",
  lineHeight: "18px",
});

/** 로딩 중에는 흐리게 — 자리는 그대로 둬서 줄이 밀리지 않는다 */
export const pending = style({ opacity: 0.55 });

/* ── 게이지 ─────────────────────────────────────────────── */

export const gaugeList = style({
  fontFamily: vars.fontFamily.base,
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: vars.space.md,
});

export const gauge = style({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  padding: "14px 16px",
  borderRadius: "12px",
  background: "rgba(7, 25, 76, 0.04)",
  minWidth: 0,
});

/** 옅은 면 위라 neutral 600 은 4.26:1 — AA 미달(2026-09-24 axe). 700 으로 올린다 */
export const gaugeLabel = style({
  color: vars.colors.neutral[700],
  fontSize: "12px",
  lineHeight: "18px",
  fontWeight: vars.fontWeights.semibold,
});

export const gaugeValue = style({
  color: vars.colors.text.primary,
  fontSize: "15px",
  lineHeight: "22px",
  fontWeight: vars.fontWeights.bold,
  fontVariantNumeric: vars.numeric.tabular,
  overflowWrap: "anywhere",
});

/** 값이 없을 때 — 굵기로 약하게 한다. 색을 흐리면 옅은 면 위에서 AA 를 못 넘는다 */
export const gaugeValueMuted = style([gaugeValue, { color: vars.colors.neutral[700], fontWeight: vars.fontWeights.medium }]);

/** 상태 글자 — 색만으로 뜻을 전하지 않는다. 넘었을 때도 글자가 있다 */
export const gaugeStatus = styleVariants({
  normal: { color: vars.colors.neutral[700], fontSize: "12px", lineHeight: "18px" },
  exceeded: {
    color: vars.colors.status.warningDark,
    fontSize: "12px",
    lineHeight: "18px",
    fontWeight: vars.fontWeights.semibold,
  },
});

/* ── 내 계획 ─────────────────────────────────────────────── */

export const planRow = style({
  display: "grid",
  gridTemplateColumns: "70px minmax(0, 1fr)",
  columnGap: vars.space.sm,
  rowGap: "8px",
  alignItems: "baseline",
});

export const planLabel = style({
  color: vars.colors.neutral[600],
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.medium,
});

export const planValue = style({
  margin: 0,
  color: vars.colors.text.primary,
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  fontVariantNumeric: vars.numeric.tabular,
  overflowWrap: "anywhere",
});

export const planMeta = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "6px",
  color: vars.colors.neutral[600],
  fontSize: "12px",
  lineHeight: "18px",
});

export const chip = style({
  display: "inline-flex",
  alignItems: "center",
  height: "22px",
  padding: "0 8px",
  borderRadius: "6px",
  background: "rgba(7, 25, 76, 0.04)",
  color: vars.colors.text.secondary,
  fontSize: "12px",
  fontWeight: vars.fontWeights.semibold,
});

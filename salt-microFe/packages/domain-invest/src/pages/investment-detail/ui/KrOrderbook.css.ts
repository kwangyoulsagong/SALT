import { globalStyle, style, styleVariants } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 상세 패널 머리 44(`FE-REQ-049` FR-3) — 제목 왼쪽 · 기준 시각 오른쪽 */
export const headingRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  minHeight: "44px",
});

export const heading = style({
  display: "flex",
  alignItems: "center",
  minHeight: "44px",
  margin: 0,
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text1,
});

/** 흰 카드 위 보조 글자 — tertiary(3.03)는 axe 미달이라 lightGray(4.6). 투자자 표와 같은 값 */
export const caption = style({
  margin: 0,
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  color: vars.colors.text.lightGray,
});

export const staleMark = style({
  marginLeft: "4px",
  color: vars.colors.text.secondary,
  fontWeight: vars.fontWeights.semibold,
});

/**
 * 3열 사다리 — 매도 잔량 | 호가 | 매수 잔량. 위 반은 매도(10 → 1단계), 아래 반은 매수(1 → 10단계).
 * 행 높이를 고정해 10초마다 값이 바뀌어도 칸이 흔들리지 않는다
 */
/** 3열 고정 폭(FR-7) — 넓은 칸에서 늘어나지 않게 상한 520 */
export const table = style({
  width: "100%",
  maxWidth: "520px",
  borderCollapse: "collapse",
  tableLayout: "fixed",
  fontSize: vars.typography.t7.fontSize,
  lineHeight: "28px",
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
});

export const th = style({
  padding: "0 8px",
  fontWeight: vars.fontWeights.medium,
  color: vars.colors.text.lightGray,
  borderBottom: `1px solid ${vars.colors.border.light}`,
  textAlign: "center",
});

const cellBase = style({
  position: "relative",
  padding: "0 8px",
  height: "28px",
  borderBottom: `1px solid ${vars.colors.background.secondary}`,
});

/** 잔량 칸 — 막대는 칸 안 절대 위치라 글자를 밀지 않는다. 매도는 오른쪽(가격 쪽)에서, 매수는 왼쪽(가격 쪽)에서 자란다 */
export const qtyCell = styleVariants({
  ask: [cellBase, { textAlign: "right", color: vars.colors.text.secondary }],
  bid: [cellBase, { textAlign: "left", color: vars.colors.text.secondary }],
  empty: [cellBase],
});

export const bar = styleVariants({
  ask: { position: "absolute", top: "4px", bottom: "4px", right: 0, background: vars.colors.special.downLight },
  bid: { position: "absolute", top: "4px", bottom: "4px", left: 0, background: vars.colors.special.upLight },
});

export const qtyText = style({ position: "relative" });

/** 호가 칸 바탕 — 매도 쪽 옅은 파랑 · 매수 쪽 옅은 빨강(국내 관례). 글자 색은 기준가 대비 */
export const priceCell = styleVariants({
  ask: [cellBase, { textAlign: "center", fontWeight: vars.fontWeights.semibold }],
  bid: [cellBase, { textAlign: "center", fontWeight: vars.fontWeights.semibold }],
});

/** 기준가 대비 — 13px 에서 4.5 이상인 Dark 쌍(새 요소 규칙, 투자자 표와 같다). 색만으로 말하지 않게 행 라벨이 따로 있다 */
export const priceTone = styleVariants({
  up: { color: vars.colors.special.upDark },
  down: { color: vars.colors.special.downDark },
  flat: { color: vars.colors.text.primary },
});

/**
 * 지금 체결가와 같은 호가 — 옅은 면 + 가격 진하게(FR-7 · B3: 검은 테두리 한 줄이 혼자 튀었다). 깜빡임 없음 — 가격 깜빡임 금지
 */
export const currentRow = style({
  background: vars.colors.desk.line,
});
globalStyle(`${currentRow} th`, { fontWeight: vars.fontWeights.bold });

export const totalRow = style({
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.primary,
});

export const totalCell = styleVariants({
  ask: { padding: "0 8px", textAlign: "right", borderTop: `1px solid ${vars.colors.border.light}` },
  label: { padding: "0 8px", textAlign: "center", borderTop: `1px solid ${vars.colors.border.light}`, color: vars.colors.text.lightGray, fontWeight: vars.fontWeights.medium },
  bid: { padding: "0 8px", textAlign: "left", borderTop: `1px solid ${vars.colors.border.light}` },
});

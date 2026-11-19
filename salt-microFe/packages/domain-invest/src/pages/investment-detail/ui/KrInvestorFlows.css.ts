import { style, styleVariants } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 상세 패널 머리(`FE-REQ-049` FR-3) — 높이 44 · 13/600. 투자자 · 소식 · 호가 패널이 같이 쓴다 */
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

/** 흰 카드 위 보조 글자 — tertiary(3.03)는 axe 미달이라 lightGray(4.6) */
export const caption = style({
  margin: 0,
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  color: vars.colors.text.lightGray,
});

/** 표 폭 상한 640(`FE-REQ-049` FR-8 · B2 — 넓은 칸에서 숫자 열 사이가 200~300px 로 벌어졌다). 좁은 화면에서 표가 카드를 넘치면 표만 가로로 민다(페이지는 밀지 않는다) */
export const scroller = style({
  overflowX: "auto",
  maxWidth: "640px",
});

export const table = style({
  width: "100%",
  borderCollapse: "collapse",
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
});

/** 열 간격 24 = 좌우 패딩 12 × 2(FR-8) */
export const th = style({
  padding: "6px 12px",
  textAlign: "right",
  fontWeight: vars.fontWeights.medium,
  color: vars.colors.text.lightGray,
  borderBottom: `1px solid ${vars.colors.border.light}`,
  selectors: { "&:first-child": { textAlign: "left" } },
});

export const td = style({
  padding: "6px 12px",
  textAlign: "right",
  borderBottom: `1px solid ${vars.colors.border.light}`,
  selectors: { "&:first-child": { textAlign: "left", color: vars.colors.text.secondary } },
});

/** 합계 줄 — 굵게, 표 맨 위(최근 거래일 위) */
export const totalRow = style({
  fontWeight: vars.fontWeights.semibold,
  backgroundColor: vars.colors.background.secondary,
});

/**
 * 순매수 부호 + 색. 색만으로 방향을 말하지 않는다 — 부호를 같이 쓴다. 새 요소라 13px 에서 4.5 이상인 `upDark` · `downDark`
 * (기본 `up` 3.6 · `down` 4.3 은 axe 미달, 2026-10-26 실측 — 기존 등락 칸 색은 정해 둔 값이라 그대로 둔다)
 */
export const net = styleVariants({
  up: { color: vars.colors.special.upDark },
  down: { color: vars.colors.special.downDark },
  flat: { color: vars.colors.text.secondary },
});

/** 오늘 프로그램 순매수 한 줄(F016 단계 B) — 일별 표 위. 라벨 왼쪽 · 값 오른쪽, 좁으면 줄바꿈 */
export const programRow = style({
  margin: 0,
  display: "flex",
  flexWrap: "wrap",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "4px 12px",
  padding: "10px 12px",
  borderRadius: 8,
  backgroundColor: vars.colors.background.secondary,
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
});

export const programLabel = style({
  color: vars.colors.text.secondary,
});

export const programValue = style({
  fontWeight: vars.fontWeights.semibold,
  fontVariantNumeric: "tabular-nums",
});

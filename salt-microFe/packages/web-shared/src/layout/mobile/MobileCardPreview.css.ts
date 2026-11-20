import { createVar, globalStyle, style, styleVariants } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 도메인 색 — 데스크톱 홈 미리보기와 같은 짝(진한 색 = 오늘 · 채움, 옅은 색 = 나머지 막대 · 트랙) */
const tone = createVar();
const toneSoft = createVar();

export const accent = styleVariants({
  savings: { vars: { [tone]: vars.colors.domain.savings, [toneSoft]: "rgba(9, 146, 104, 0.22)" } },
  household: { vars: { [tone]: vars.colors.domain.household, [toneSoft]: "rgba(232, 89, 12, 0.22)" } },
  invest: { vars: { [tone]: vars.colors.domain.invest, [toneSoft]: "rgba(66, 99, 235, 0.22)" } },
  tips: { vars: { [tone]: vars.colors.domain.tips, [toneSoft]: "rgba(196, 106, 0, 0.22)" } },
});

/** 미리보기 칸 — 카드 행 아래 · 바닥 줄 위. 높이 56(그림) + 한 줄 */
export const box = style({ display: "flex", flexDirection: "column", gap: "6px", padding: "4px 0 8px", minWidth: 0 });

export const trend = style({ display: "block", width: "100%", height: "56px" });

export const bars = style({
  display: "flex",
  alignItems: "flex-end",
  gap: "2px",
  height: "56px",
  boxShadow: `inset 0 -1px 0 ${vars.colors.neutral[200]}`,
});
const barBase = { flex: 1, minWidth: 0, borderRadius: "3px 3px 0 0" } as const;
export const bar = style([barBase, { background: toneSoft }]);
export const barLast = style([barBase, { background: tone }]);
export const barFuture = style({ flex: 1, minWidth: 0, height: 0 });

export const caption = style({
  margin: 0,
  fontSize: vars.appType.caption.fontSize,
  lineHeight: vars.appType.caption.lineHeight,
  color: vars.colors.text.tertiary,
});

export const progressList = style({ display: "flex", flexDirection: "column", gap: "10px", margin: 0, padding: 0, listStyle: "none" });
/** 이름 · 막대 · 값 — 글자를 키우면 막대가 다음 줄로 */
export const progressRow = style({ display: "grid", gridTemplateColumns: "minmax(64px, auto) minmax(0, 1fr) auto", alignItems: "center", gap: "4px 10px" });
export const progressName = style({
  fontSize: vars.appType.caption.fontSize,
  lineHeight: vars.appType.caption.lineHeight,
  color: vars.colors.neutral[700],
  overflowWrap: "anywhere",
});
export const progressValue = style({
  fontSize: vars.appType.caption.fontSize,
  lineHeight: vars.appType.caption.lineHeight,
  fontWeight: vars.fontWeights.semibold,
  fontVariantNumeric: "tabular-nums",
  color: vars.colors.neutral[800],
});
export const progressTrack = style({});
globalStyle(`${progressTrack}${progressTrack}`, { background: toneSoft });
globalStyle(`${progressTrack} > div`, { background: tone });

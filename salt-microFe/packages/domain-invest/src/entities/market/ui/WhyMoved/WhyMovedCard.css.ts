import { style, styleVariants } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 카드 안 묶음 사이 — 겉 카드(패딩 · 그림자)는 쓰는 자리가 `className` 으로 준다(국내 `krSideCard` · 코인 `card`) */
/** 넓은 카드에서도 한 줄은 720 까지(`screen-desktop.md` §2) — 막대와 값이 멀어지지 않게 */
export const body = style({ display: "flex", flexDirection: "column", gap: "14px", minWidth: 0, maxWidth: "720px" });

export const heading = style({
  margin: 0,
  fontSize: vars.typography.t5.fontSize,
  lineHeight: vars.typography.t5.lineHeight,
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.primary,
});

export const subheading = style({
  margin: 0,
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.primary,
});

/** 오늘 등락 · 평소 변동 한 줄 */
export const todayLine = style({
  margin: 0,
  display: "flex",
  flexWrap: "wrap",
  gap: "4px 10px",
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,
  color: vars.colors.text.secondary,
  fontVariantNumeric: "tabular-nums",
});

/** 흰 카드 위 보조 글자 — tertiary(3.03)는 axe 미달이라 lightGray(4.6) */
export const caption = style({
  margin: 0,
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  color: vars.colors.text.lightGray,
});

/** 분해 표 — 라벨 | 막대 | 값. 좁은 화면에서도 한 줄(라벨은 줄바꿈 허용) */
export const table = style({ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" });
export const labelCell = style({
  width: "42%",
  padding: "6px 8px 6px 0",
  textAlign: "left",
  fontWeight: vars.fontWeights.regular,
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,
  color: vars.colors.text.primary,
  // 한국어는 단어 단위로 — "업/종"처럼 글자 중간에서 끊지 않는다(390 웹뷰). 긴 영문 코드만 아무 데서나
  wordBreak: "keep-all",
  overflowWrap: "anywhere",
});
export const barCell = style({ padding: "6px 8px" });
export const valueCell = style({
  width: "84px",
  padding: "6px 0",
  textAlign: "right",
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,
  fontWeight: vars.fontWeights.semibold,
  whiteSpace: "nowrap",
});

/** 막대 자리 — 가운데 0, 왼쪽 음 · 오른쪽 양(색만으로 방향을 말하지 않는다 — 값 칸에 부호) */
export const track = style({
  position: "relative",
  height: "8px",
  borderRadius: "4px",
  background: vars.colors.background.gray,
  overflow: "hidden",
});
export const zeroLine = style({
  position: "absolute",
  left: "50%",
  top: 0,
  bottom: 0,
  width: "1px",
  background: vars.colors.border.light,
});
export const bar = styleVariants({
  up: { position: "absolute", top: 0, bottom: 0, left: "50%", background: vars.colors.special.up, borderRadius: "0 4px 4px 0" },
  down: { position: "absolute", top: 0, bottom: 0, right: "50%", background: vars.colors.special.down, borderRadius: "4px 0 0 4px" },
  flat: { display: "none" },
});
/** 값 글자 — 작은 글자 새 자리라 진한 쌍(대비 4.5 이상, `krStock.css` changeStrong 과 같은 판단) */
export const value = styleVariants({
  up: { color: vars.colors.special.upDark, fontVariantNumeric: "tabular-nums" },
  down: { color: vars.colors.special.downDark, fontVariantNumeric: "tabular-nums" },
  flat: { color: vars.colors.text.secondary, fontVariantNumeric: "tabular-nums" },
});

export const factList = style({ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column" });
export const fact = style({
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  padding: "10px 0",
  borderBottom: `1px solid ${vars.colors.border.light}`,
  selectors: { "&:last-child": { borderBottom: "none" } },
  minWidth: 0,
});
export const factMeta = style({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "6px",
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  color: vars.colors.text.lightGray,
  fontVariantNumeric: "tabular-nums",
});
export const factText = style({
  margin: 0,
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,
  color: vars.colors.text.primary,
  overflowWrap: "anywhere",
});

/** 카드 조건이 아닌 날 — 접힌 한 줄. 펼치면 같은 내용 */
export const collapsed = style({ minWidth: 0 });
export const collapsedSummary = style({
  cursor: "pointer",
  minHeight: "44px",
  display: "flex",
  alignItems: "center",
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.secondary,
});
export const collapsedBody = style({ paddingTop: "8px" });

/** 시장 표 행의 "왜?" — 행 이름 옆 작은 링크(터치 타깃은 행 전체가 따로 있다 · 이 링크는 키보드 · 가운데 클릭용) */
export const rowChip = style({
  display: "inline-flex",
  alignItems: "center",
  flexShrink: 0,
  padding: "1px 6px",
  borderRadius: "999px",
  border: `1px solid ${vars.colors.border.light}`,
  fontSize: "11px",
  lineHeight: "16px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.secondary,
  textDecoration: "none",
  whiteSpace: "nowrap",
  selectors: { "&:focus-visible": { outline: `2px solid ${vars.colors.border.focus}`, outlineOffset: "2px" } },
});

/** 스크린리더만 읽는 표 머리 */
export const srOnly = style({
  position: "absolute",
  width: "1px",
  height: "1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
});

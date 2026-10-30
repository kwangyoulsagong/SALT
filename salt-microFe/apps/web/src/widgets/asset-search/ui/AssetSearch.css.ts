import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 문장 · 목록 한 줄은 최대 720px(`screen-desktop.md` §2) — 검색 화면은 목록 하나라 본문 폭을 이것으로 묶는다 */
export const section = style({ maxWidth: 720, width: "100%", marginTop: vars.space.lg });

/** 결과에 따라 표 폭이 바뀌지 않게 칸을 채운다 */
export const list = style({ width: "100%" });

export const header = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.md,
});

/** 지우기 버튼이 생겨도 폭이 흔들리지 않게 줄을 채운다 */
export const field = style({ flex: 1, minWidth: 0 });

/** 라벨 단 — 카운터는 보조 정보다. 숫자는 고정폭 */
export const counter = style({
  whiteSpace: "nowrap",
  color: vars.colors.text.tertiary,
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  fontWeight: vars.fontWeights.semibold,
  fontVariantNumeric: "tabular-nums",
});

/** 상한에 닿은 카운터(FR-75) — 색만이 아니라 굵기도 바꾼다(색만으로 상태를 전하지 않는다, `a11y-policy.md`) */
export const counterFull = style([counter, { color: vars.colors.text.primary, fontWeight: vars.fontWeights.bold }]);

/** 화면에 보이지 않고 스크린리더만 읽는다 — 결과 수 알림(FR-78) */
export const srOnly = style({
  position: "absolute",
  width: "1px",
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
});

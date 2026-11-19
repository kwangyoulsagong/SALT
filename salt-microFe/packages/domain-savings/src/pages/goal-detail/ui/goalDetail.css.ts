import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 목표 상세(`FE-REQ-060` FR-9) — 틀은 `DetailTabs`(알약 탭 · 고정 열 360). 글자는 데스크톱 4단 토큰만 */
const WIDE = "screen and (min-width: 1280px)";

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

export const stack = style({ display: "flex", flexDirection: "column", gap: "12px", minWidth: 0 });

/** 머리 2줄(≤ 88) — 이름 14/700 + 템플릿 칩 / 앞 숫자 18/700 · 진척 */
export const head = style({ display: "flex", flexDirection: "column", gap: "4px" });
export const name = style({
  margin: 0,
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: vars.deskType.section.fontSize,
  lineHeight: vars.deskType.section.lineHeight,
  fontWeight: vars.fontWeights.bold,
  color: vars.colors.desk.text1,
});
export const chip = style({ ...label, padding: "0 8px", borderRadius: "999px", background: vars.colors.desk.line });
export const headLine = style({ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" });
export const leadValue = style({
  fontSize: vars.deskType.title.fontSize,
  lineHeight: vars.deskType.title.lineHeight,
  fontWeight: vars.deskType.title.fontWeight,
  color: vars.colors.desk.text1,
  fontVariantNumeric: "tabular-nums",
});

export const muted = style({ ...label, margin: 0 });
export const value = style({ ...body, fontVariantNumeric: "tabular-nums" });
/** 이름 위 · 값 아래 — 넓은 패널에서 이름과 값을 양 끝으로 떼지 않는다(M1 "값 두 개가 650px 떨어진다") */
export const kv = style({ display: "flex", flexDirection: "column", gap: "2px" });

/** 계획 패널 — 장면 왼쪽 · 숫자 오른쪽 */
export const planRow = style({ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" });
export const planText = style({ display: "flex", flexDirection: "column", gap: "4px", flex: 1, minWidth: "200px", maxWidth: "480px" });

/** 입력 묶음은 내용 폭 — 넓은 패널 끝까지 늘리지 않는다 */
export const formWidth = style({ maxWidth: "480px" });

/** 이정표 · 도달 · 넣지 않은 달 — 한 패널 안 세 칸(1280 미만은 세로) */
export const cells = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "8px",
  alignItems: "stretch",
  "@media": { [WIDE]: { gridTemplateColumns: "repeat(3, minmax(0, 1fr))" } },
});

export const deposits = style({ display: "flex", flexDirection: "column", margin: 0, padding: 0, listStyle: "none" });
export const depositRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  minHeight: "44px",
  padding: "4px 0",
  borderBottom: `1px solid ${vars.colors.desk.line}`,
  selectors: { "&:last-child": { borderBottom: "none" } },
});
export const depositMain = style({ display: "flex", flexDirection: "column", minWidth: 0 });

/** 고정 열 — 넣기 → 비상시 → 저울 링크 */
export const aside = style({ display: "flex", flexDirection: "column", gap: "20px", minWidth: 0 });
export const asideBlock = style({ display: "flex", flexDirection: "column", gap: "8px" });

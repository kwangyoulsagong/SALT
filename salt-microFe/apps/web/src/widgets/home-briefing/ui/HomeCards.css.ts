import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/**
 * 홈 대시보드 배치(2026-11-26 — 사용자 "카드 몇 장으로는 대시보드가 아니다" · 배치 A 숫자 띠 + 3단 격자 고름).
 * 숫자 띠 → 격자 세 줄, 줄마다 같은 꼴(넓음 2칸 + 좁음 1칸): 지출 흐름 | 저축 목표 / 시장 | 코치 브리핑 / 최근 기록 | 다가오는 일.
 * 투자 흐름 그래프는 숫자 띠 투자 칸 안 작은 선(첫 판은 좁은 칸 셋 줄이라 시장 이름이 잘렸다).
 * 열 수는 **본문 칸 폭**으로 고른다(컨테이너 쿼리 — 사이드 312 가 있어 화면 폭과 다르다): 900 이상 셋 · 600 이상 둘 · 그 밑 하나.
 * 칸 끝이 줄마다 맞는다(전 판은 카드 줄 `auto-fill` 이 빈 넷째 칸을 남겨 아래 줄과 오른쪽 끝이 어긋났다)
 */
export const dashboard = style({
  containerType: "inline-size",
  display: "flex",
  flexDirection: "column",
  gap: vars.space.lg,
  width: "100%",
  minWidth: 0,
});

export const grid = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: vars.space.lg,
  alignItems: "stretch",
  "@container": {
    "(min-width: 600px)": { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
    "(min-width: 900px)": { gridTemplateColumns: "repeat(3, minmax(0, 1fr))" },
  },
});

/** 두 칸 차지(지출 흐름 · 최근 기록) — 한 열일 때는 한 칸 */
export const wide = style({
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  "@container": { "(min-width: 600px)": { gridColumn: "span 2" } },
});

/** 칸 — 안 블록이 줄 높이를 채운다 */
export const cell = style({ minWidth: 0, display: "flex", flexDirection: "column" });

export const fill = style({ flex: 1, display: "flex", flexDirection: "column" });

/** 대기 칸 */
export const skeletonKpi = style({ minHeight: "108px" });
export const skeletonRow = style({ minHeight: "300px" });

/** 사이드 최근 알림 — 줄 셋 */
export const alertList = style({ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" });

export const sideNote = style({
  margin: 0,
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text2,
});

export const sideMore = style({
  display: "inline-flex",
  alignItems: "center",
  alignSelf: "flex-end",
  gap: "2px",
  marginTop: vars.space.xs,
  color: vars.colors.desk.text2,
  textDecoration: "none",
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  selectors: {
    "&:hover": { color: vars.colors.desk.text1 },
    "&:focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "2px" },
  },
});
